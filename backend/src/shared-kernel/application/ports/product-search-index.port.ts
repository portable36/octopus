import type { CatalogOfferSearchSourceDto } from './catalog-offer-search-source.port';

export const PRODUCT_SEARCH_INDEX = Symbol('PRODUCT_SEARCH_INDEX');

export type SearchStockStatus = 'IN_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN';

export type OfferSearchDocumentDto = {
  readonly id: string;
  readonly offerId: string;
  readonly productId: string;
  readonly variantId: string;
  readonly vendorId: string;
  readonly storeId: string;
  readonly name: string;
  readonly slug: string;
  readonly sku: string;
  readonly shortDescription: string;
  readonly semanticText: string;
  readonly brandId: string | null;
  readonly categoryIds: readonly string[];
  readonly priceMinor: number;
  readonly currencyCode: string;
  readonly stockStatus: SearchStockStatus;
  readonly offerStatus: string;
  readonly productStatus: string;
  readonly searchable: boolean;
  readonly primaryImageMediaId: string | null;
  readonly updatedAtUnix: number;
  readonly version: number;
};

export type SearchProductsQueryDto = {
  readonly q?: string;
  readonly vendorId?: string;
  readonly storeId?: string;
  readonly categoryId?: string;
  readonly minPriceMinor?: number;
  readonly maxPriceMinor?: number;
  readonly stockStatus?: SearchStockStatus;
  readonly sort?: 'relevance' | 'price_asc' | 'price_desc' | 'newest';
  readonly page?: number;
  readonly limit?: number;
};

export type SearchFacetBucketDto = {
  readonly value: string;
  readonly count: number;
};

/** App-shaped facets — never pass through raw Meilisearch facetDistribution. */
export type SearchFacetsDto = {
  readonly categoryIds: readonly SearchFacetBucketDto[];
  readonly vendorId: readonly SearchFacetBucketDto[];
  readonly storeId: readonly SearchFacetBucketDto[];
  readonly stockStatus: readonly SearchFacetBucketDto[];
};

export type SearchProductsResultDto = {
  readonly hits: readonly OfferSearchDocumentDto[];
  readonly query: string;
  readonly page: number;
  readonly limit: number;
  readonly estimatedTotal: number;
  readonly processingTimeMs: number;
  readonly facets: SearchFacetsDto;
};

/** Storefront search hit — index fields plus resolved image URL at read time. */
export type SearchProductHitDto = OfferSearchDocumentDto & {
  readonly primaryImageUrl: string | null;
};

export interface ProductSearchIndexPort {
  ensureIndex(): Promise<void>;
  upsert(document: OfferSearchDocumentDto): Promise<void>;
  upsertIfNewer(document: OfferSearchDocumentDto): Promise<'written' | 'skipped'>;
  /** Build + upsert from catalog projection (+ optional live stock). */
  indexOfferSource(
    source: CatalogOfferSearchSourceDto,
    stockAvailable?: number | null,
  ): Promise<'written' | 'skipped'>;
  deleteByOfferId(offerId: string): Promise<void>;
  search(query: SearchProductsQueryDto): Promise<SearchProductsResultDto>;
  /** Push synonym map from DB to Meilisearch index settings. */
  syncSynonyms(synonyms: Readonly<Record<string, readonly string[]>>): Promise<void>;
}
