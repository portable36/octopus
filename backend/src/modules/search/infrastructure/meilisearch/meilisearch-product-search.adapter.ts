import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MeiliSearch, type Index } from 'meilisearch';
import { AppConfigService } from '../../../../config/app-config.service';
import type {
  OfferSearchDocument,
  SearchProductsQuery,
  SearchProductsResult,
} from '../../domain/search.types';
import type { ProductSearchIndexPort } from '../../application/ports/product-search-index.port';

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
  }

  public async upsert(document: OfferSearchDocument): Promise<void> {
    await this.index().addDocuments([document], { primaryKey: 'id' });
  }

  public async upsertIfNewer(document: OfferSearchDocument): Promise<'written' | 'skipped'> {
    try {
      const existing = await this.index().getDocument<OfferSearchDocument>(document.id);
      if (typeof existing.version === 'number' && existing.version > document.version) {
        return 'skipped';
      }
      if (
        typeof existing.updatedAtUnix === 'number' &&
        existing.updatedAtUnix > document.updatedAtUnix &&
        existing.version === document.version
      ) {
        return 'skipped';
      }
    } catch {
      // Missing document → write.
    }
    await this.upsert(document);
    return 'written';
  }

  public async deleteByOfferId(offerId: string): Promise<void> {
    await this.index().deleteDocument(offerId);
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

    const result = await this.index().search<OfferSearchDocument>(query.q ?? '', {
      filter: filters.join(' AND '),
      ...(sort ? { sort } : {}),
      offset,
      limit,
    });

    return {
      hits: result.hits,
      query: query.q ?? '',
      page,
      limit,
      estimatedTotal: result.estimatedTotalHits ?? result.hits.length,
      processingTimeMs: result.processingTimeMs,
    };
  }

  private index(): Index<OfferSearchDocument> {
    return this.client.index<OfferSearchDocument>(this.indexUid);
  }
}

function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
