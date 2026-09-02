export const CATALOG_OFFER_SEARCH_SOURCE = Symbol('CATALOG_OFFER_SEARCH_SOURCE');

export type CatalogSearchAttribute = {
  readonly code: string;
  readonly value: string | number | boolean | readonly string[];
};

/** Catalog projection shape for Meilisearch documents (no cost/private fields). */
export type CatalogOfferSearchSourceDto = {
  readonly offerId: string;
  readonly productId: string;
  readonly variantId: string;
  readonly vendorId: string;
  readonly storeId: string;
  readonly name: string;
  readonly variantName?: string | null;
  readonly slug: string;
  readonly sku: string;
  readonly shortDescription?: string | null;
  readonly brandId?: string | null;
  readonly categoryIds?: readonly string[];
  readonly categoryNames?: readonly string[];
  readonly productAttributes?: readonly CatalogSearchAttribute[];
  readonly variantAttributes?: readonly CatalogSearchAttribute[];
  readonly reviewTexts?: readonly string[];
  readonly priceMinor: number;
  readonly currencyCode: string;
  readonly offerStatus: string;
  readonly offerAvailable: boolean;
  readonly productStatus: string;
  readonly primaryImageMediaId?: string | null;
  readonly updatedAt: Date;
  readonly version: number;
};

/**
 * Catalog → Search projection. Search never imports Catalog tables.
 */
export type CatalogOfferIdPage = {
  readonly offerIds: readonly string[];
  /** Pass as `afterId` on the next call; null when exhausted. */
  readonly nextAfterId: string | null;
};

export interface CatalogOfferSearchSourcePort {
  loadOfferSource(offerId: string): Promise<CatalogOfferSearchSourceDto | null>;
  /** Batch load for reindex; missing ids are omitted from the result. */
  loadOfferSources(offerIds: readonly string[]): Promise<readonly CatalogOfferSearchSourceDto[]>;
  listOfferIdsByProductId(productId: string): Promise<readonly string[]>;
  listOfferIdsByVariantId(variantId: string): Promise<readonly string[]>;
  listOfferIdsByStoreAndVariant(storeId: string, variantId: string): Promise<readonly string[]>;
  /** Stable id-ordered pages for admin reindex (not for storefront). */
  listOfferIdsPage(afterId: string | null, limit: number): Promise<CatalogOfferIdPage>;
}
