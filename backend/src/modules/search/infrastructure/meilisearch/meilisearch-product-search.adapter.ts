import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MeiliSearch, type Index } from 'meilisearch';
import { AppConfigService } from '../../../../config/app-config.service';
import type {
  OfferSearchDocument,
  SearchProductsQuery,
  SearchProductsResult,
} from '../../domain/search.types';
import type { ProductSearchIndexPort } from '../../../../shared-kernel/application/ports/product-search-index.port';
import type { CatalogOfferSearchSourceDto } from '../../../../shared-kernel/application/ports/catalog-offer-search-source.port';
import { buildOfferSearchDocument } from '../../domain/services/build-offer-search-document';
import { withExternalSpan } from '../../../../shared-kernel/infrastructure/observability/external-span';

const SEARCHABLE = ['name', 'sku', 'shortDescription', 'slug'] as const;
const FILTERABLE = [
  'vendorId',
  'storeId',
  'categoryIds',
  'brandId',
  'priceMinor',
  'stockStatus',
  'searchable',
  'offerStatus',
  'productStatus',
  'currencyCode',
] as const;
const SORTABLE = ['priceMinor', 'updatedAtUnix'] as const;

@Injectable()
export class MeilisearchProductSearchAdapter implements ProductSearchIndexPort, OnModuleInit {
  private readonly logger = new Logger(MeilisearchProductSearchAdapter.name);
  private readonly client: MeiliSearch;
  private readonly indexUid: string;

  constructor(private readonly config: AppConfigService) {
    this.client = new MeiliSearch({
      host: this.config.meilisearchHost,
      apiKey: this.config.meilisearchApiKey,
    });
    this.indexUid = this.config.searchProductsIndex;
  }

  public async onModuleInit(): Promise<void> {
    if (this.config.isTest) {
      return;
    }
    try {
      await this.ensureIndex();
    } catch (error) {
      // ponytail: search is eventually consistent; boot must not die if Meili is down.
      this.logger.warn(
        `Meilisearch ensureIndex deferred: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  public async ensureIndex(): Promise<void> {
    return withExternalSpan(
      'search.meili.ensure_index',
      {
        'octopus.search.index': this.indexUid,
        'octopus.search.op': 'ensure_index',
      },
      async () => {
        try {
          await this.client.createIndex(this.indexUid, { primaryKey: 'id' });
        } catch {
          // Index may already exist.
        }
        const index = this.index();
        await index.updateSettings({
          searchableAttributes: [...SEARCHABLE],
          filterableAttributes: [...FILTERABLE],
          sortableAttributes: [...SORTABLE],
          displayedAttributes: ['*'],
        });
      },
    );
  }

  public async upsert(document: OfferSearchDocument): Promise<void> {
    return withExternalSpan(
      'search.meili.upsert',
      {
        'octopus.search.index': this.indexUid,
        'octopus.search.op': 'upsert',
        'octopus.search.offer_id': document.offerId,
      },
      async () => {
        await this.index().addDocuments([document], { primaryKey: 'id' });
      },
    );
  }

  public async upsertIfNewer(document: OfferSearchDocument): Promise<'written' | 'skipped'> {
    return withExternalSpan(
      'search.meili.upsert_if_newer',
      {
        'octopus.search.index': this.indexUid,
        'octopus.search.op': 'upsert_if_newer',
        'octopus.search.offer_id': document.offerId,
        'octopus.search.version': document.version,
      },
      async (span) => {
        try {
          const existing = await this.index().getDocument<OfferSearchDocument>(document.id);
          if (typeof existing.version === 'number' && existing.version > document.version) {
            span.setAttribute('octopus.search.write_result', 'skipped');
            return 'skipped';
          }
          if (
            typeof existing.updatedAtUnix === 'number' &&
            existing.updatedAtUnix > document.updatedAtUnix &&
            existing.version === document.version
          ) {
            span.setAttribute('octopus.search.write_result', 'skipped');
            return 'skipped';
          }
        } catch {
          // Missing document → write.
        }
        await this.upsert(document);
        span.setAttribute('octopus.search.write_result', 'written');
        return 'written';
      },
    );
  }

  public async indexOfferSource(
    source: CatalogOfferSearchSourceDto,
    stockAvailable?: number | null,
  ): Promise<'written' | 'skipped'> {
    return this.upsertIfNewer(
      buildOfferSearchDocument({
        ...source,
        stockAvailable: stockAvailable ?? null,
      }),
    );
  }

  public async deleteByOfferId(offerId: string): Promise<void> {
    return withExternalSpan(
      'search.meili.delete',
      {
        'octopus.search.index': this.indexUid,
        'octopus.search.op': 'delete',
        'octopus.search.offer_id': offerId,
      },
      async () => {
        await this.index().deleteDocument(offerId);
      },
    );
  }

  public async search(query: SearchProductsQuery): Promise<SearchProductsResult> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const offset = (page - 1) * limit;
    const filters: string[] = ['searchable = true'];

    if (query.vendorId) {
      filters.push(`vendorId = "${escapeFilterValue(query.vendorId)}"`);
    }
    if (query.storeId) {
      filters.push(`storeId = "${escapeFilterValue(query.storeId)}"`);
    }
    if (query.categoryId) {
      filters.push(`categoryIds = "${escapeFilterValue(query.categoryId)}"`);
    }
    if (query.stockStatus) {
      filters.push(`stockStatus = "${query.stockStatus}"`);
    }
    if (query.minPriceMinor !== undefined) {
      filters.push(`priceMinor >= ${query.minPriceMinor}`);
    }
    if (query.maxPriceMinor !== undefined) {
      filters.push(`priceMinor <= ${query.maxPriceMinor}`);
    }

    const sort =
      query.sort === 'price_asc'
        ? ['priceMinor:asc']
        : query.sort === 'price_desc'
          ? ['priceMinor:desc']
          : query.sort === 'newest'
            ? ['updatedAtUnix:desc']
            : undefined;

    const facetKeys = ['categoryIds', 'vendorId', 'storeId', 'stockStatus'] as const;
    return withExternalSpan(
      'search.meili.search',
      {
        'octopus.search.index': this.indexUid,
        'octopus.search.op': 'search',
        'octopus.search.page': page,
        'octopus.search.limit': limit,
        'octopus.search.has_query': Boolean(query.q?.trim()),
        ...(query.vendorId ? { 'octopus.search.vendor_id': query.vendorId } : {}),
        ...(query.storeId ? { 'octopus.search.store_id': query.storeId } : {}),
        ...(query.sort ? { 'octopus.search.sort': query.sort } : {}),
      },
      async (span) => {
        const result = await this.index().search<OfferSearchDocument>(query.q ?? '', {
          filter: filters.join(' AND '),
          ...(sort ? { sort } : {}),
          offset,
          limit,
          facets: [...facetKeys],
        });

        const estimatedTotal = result.estimatedTotalHits ?? result.hits.length;
        span.setAttribute('octopus.search.estimated_total', estimatedTotal);
        span.setAttribute('octopus.search.processing_time_ms', result.processingTimeMs);

        const distribution = result.facetDistribution ?? {};
        return {
          hits: result.hits,
          query: query.q ?? '',
          page,
          limit,
          estimatedTotal,
          processingTimeMs: result.processingTimeMs,
          facets: {
            categoryIds: toFacetBuckets(distribution['categoryIds']),
            vendorId: toFacetBuckets(distribution['vendorId']),
            storeId: toFacetBuckets(distribution['storeId']),
            stockStatus: toFacetBuckets(distribution['stockStatus']),
          },
        };
      },
    );
  }

  private index(): Index<OfferSearchDocument> {
    return this.client.index<OfferSearchDocument>(this.indexUid);
  }
}

function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function toFacetBuckets(
  raw: Record<string, number> | undefined,
): readonly { value: string; count: number }[] {
  if (!raw) {
    return [];
  }
  return Object.entries(raw)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}
