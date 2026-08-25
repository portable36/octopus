export type SearchStockStatus = 'IN_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN';

/**
 * Meilisearch document for a sellable store offer (marketplace unit).
 * Document primary key = offerId. No cost / supplier / internal fields.
 */
export type OfferSearchDocument = {
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
  readonly brandId: string | null;
  readonly categoryIds: readonly string[];
  readonly priceMinor: number;
  readonly currencyCode: string;
  readonly stockStatus: SearchStockStatus;
  readonly offerStatus: string;
  readonly productStatus: string;
  readonly searchable: boolean;
  readonly updatedAtUnix: number;
  readonly version: number;
};

export type OfferSearchSource = {
  readonly offerId: string;
  readonly productId: string;
  readonly variantId: string;
  readonly vendorId: string;
  readonly storeId: string;
  readonly name: string;
  readonly slug: string;
  readonly sku: string;
  readonly shortDescription?: string | null;
  readonly brandId?: string | null;
  readonly categoryIds?: readonly string[];
  readonly priceMinor: number;
  readonly currencyCode: string;
  readonly offerStatus: string;
  readonly offerAvailable: boolean;
  readonly productStatus: string;
  readonly stockAvailable?: number | null;
  readonly updatedAt: Date;
  readonly version: number;
};

export type SearchProductsQuery = {
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

export type SearchProductsResult = {
  readonly hits: readonly OfferSearchDocument[];
  readonly query: string;
  readonly page: number;
  readonly limit: number;
  readonly estimatedTotal: number;
  readonly processingTimeMs: number;
};
