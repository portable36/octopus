export type {
  OfferSearchDocumentDto as OfferSearchDocument,
  SearchProductsQueryDto as SearchProductsQuery,
  SearchProductsResultDto as SearchProductsResult,
  SearchStockStatus,
} from '../../../shared-kernel/application/ports/product-search-index.port';

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
