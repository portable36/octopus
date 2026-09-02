import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';
import {
  PRODUCT_SEARCH_INDEX,
  type ProductSearchIndexPort,
} from '../../../../shared-kernel/application/ports/product-search-index.port';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import { SearchSynonymMapping } from '../../infrastructure/entities/search-synonym-mapping.entity';
import { SearchZeroResultQuery } from '../../infrastructure/entities/search-zero-result-query.entity';

const ZERO_RESULT_REVIEW_THRESHOLD = 3;

export type SearchSynonymDto = {
  readonly id: string;
  readonly sourceTerm: string;
  readonly targetTerms: readonly string[];
  readonly status: 'active' | 'pending';
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type ZeroResultQueryDto = {
  readonly id: string;
  readonly normalizedQuery: string;
  readonly occurrenceCount: number;
  readonly needsReview: boolean;
  readonly mappedSynonymId: string | null;
  readonly lastSeenAt: Date;
};

@Injectable()
export class SearchSynonymService {
  constructor(
    private readonly em: EntityManager,
    @Inject(PRODUCT_SEARCH_INDEX) private readonly searchIndex: ProductSearchIndexPort,
  ) {}

  public async recordZeroResultQuery(rawQuery: string): Promise<void> {
    const normalizedQuery = normalizeSearchQuery(rawQuery);
    if (normalizedQuery.length < 2) {
      return;
    }

    await withRlsContext(this.em, async (tx) => {
      const existing = await tx.findOne(SearchZeroResultQuery, { normalizedQuery });
      if (existing) {
        existing.occurrenceCount += 1;
        existing.lastSeenAt = new Date();
        if (existing.occurrenceCount >= ZERO_RESULT_REVIEW_THRESHOLD) {
          existing.needsReview = true;
        }
        await tx.flush();
        return;
      }

      tx.persist(
        tx.create(SearchZeroResultQuery, {
          id: randomUUID(),
          normalizedQuery,
          occurrenceCount: 1,
          needsReview: false,
          lastSeenAt: new Date(),
          createdAt: new Date(),
        }),
      );
      await tx.flush();
    });
  }

  public async listZeroResultQueries(needsReviewOnly = true): Promise<readonly ZeroResultQueryDto[]> {
    return withRlsContext(this.em, async (tx) => {
      const rows = await tx.find(
        SearchZeroResultQuery,
        needsReviewOnly ? { needsReview: true } : {},
        { orderBy: { occurrenceCount: 'desc', lastSeenAt: 'desc' }, limit: 100 },
      );
      return rows.map(toZeroResultDto);
    });
  }

  public async listSynonyms(): Promise<readonly SearchSynonymDto[]> {
    return withRlsContext(this.em, async (tx) => {
      const rows = await tx.find(SearchSynonymMapping, {}, { orderBy: { updatedAt: 'desc' } });
      return rows.map(toSynonymDto);
    });
  }

  public async createSynonym(input: {
    readonly sourceTerm: string;
    readonly targetTerms: readonly string[];
    readonly activate?: boolean;
  }): Promise<SearchSynonymDto> {
    const sourceTerm = normalizeSearchQuery(input.sourceTerm);
    const targetTerms = [...new Set(input.targetTerms.map((term) => term.trim()).filter(Boolean))];
    if (!sourceTerm || targetTerms.length === 0) {
      throw new Error('Synonym requires a source term and at least one target term.');
    }

    const saved = await withRlsContext(this.em, async (tx) => {
      const existing = await tx.findOne(SearchSynonymMapping, { sourceTerm });
      const entity =
        existing ??
        tx.create(SearchSynonymMapping, {
          id: randomUUID(),
          sourceTerm,
          targetTerms,
          status: input.activate ? 'active' : 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      entity.targetTerms = targetTerms;
      entity.status = input.activate ? 'active' : entity.status;
      entity.updatedAt = new Date();
      tx.persist(entity);
      await tx.flush();
      return entity;
    });

    if (saved.status === 'active') {
      await this.pushSynonymsToMeilisearch();
    }
    return toSynonymDto(saved);
  }

  public async activateSynonym(id: string): Promise<SearchSynonymDto> {
    const saved = await withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(SearchSynonymMapping, { id });
      if (!entity) {
        throw new Error(`Synonym mapping not found: ${id}`);
      }
      entity.status = 'active';
      entity.updatedAt = new Date();
      await tx.flush();
      return entity;
    });
    await this.pushSynonymsToMeilisearch();
    return toSynonymDto(saved);
  }

  public async mapZeroResultToSynonym(
    zeroResultId: string,
    targetTerms: readonly string[],
  ): Promise<{ readonly synonym: SearchSynonymDto; readonly query: ZeroResultQueryDto }> {
    const query = await withRlsContext(this.em, async (tx) => {
      const row = await tx.findOne(SearchZeroResultQuery, { id: zeroResultId });
      if (!row) {
        throw new Error(`Zero-result query not found: ${zeroResultId}`);
      }
      return row;
    });

    const synonym = await this.createSynonym({
      sourceTerm: query.normalizedQuery,
      targetTerms,
      activate: true,
    });

    const updatedQuery = await withRlsContext(this.em, async (tx) => {
      const row = await tx.findOne(
        SearchZeroResultQuery,
        { id: zeroResultId },
        { populate: ['mappedSynonym'] },
      );
      if (!row) {
        throw new Error(`Zero-result query not found: ${zeroResultId}`);
      }
      const mapped = await tx.findOne(SearchSynonymMapping, { id: synonym.id });
      row.mappedSynonym = mapped;
      row.needsReview = false;
      await tx.flush();
      return row;
    });

    return { synonym, query: toZeroResultDto(updatedQuery) };
  }

  public async pushSynonymsToMeilisearch(): Promise<void> {
    const synonyms = await withRlsContext(this.em, async (tx) => {
      const rows = await tx.find(SearchSynonymMapping, { status: 'active' });
      const map: Record<string, string[]> = {};
      for (const row of rows) {
        map[row.sourceTerm] = [...row.targetTerms];
      }
      return map;
    });
    await this.searchIndex.syncSynonyms(synonyms);
  }
}

export function normalizeSearchQuery(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

function toSynonymDto(entity: SearchSynonymMapping): SearchSynonymDto {
  return {
    id: entity.id,
    sourceTerm: entity.sourceTerm,
    targetTerms: [...entity.targetTerms],
    status: entity.status,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

function toZeroResultDto(entity: SearchZeroResultQuery): ZeroResultQueryDto {
  return {
    id: entity.id,
    normalizedQuery: entity.normalizedQuery,
    occurrenceCount: entity.occurrenceCount,
    needsReview: entity.needsReview,
    mappedSynonymId: entity.mappedSynonym?.id ?? null,
    lastSeenAt: entity.lastSeenAt,
  };
}
