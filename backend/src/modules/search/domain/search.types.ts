export type {
  OfferSearchDocumentDto as OfferSearchDocument,
  SearchProductsQueryDto as SearchProductsQuery,
  SearchProductsResultDto as SearchProductsResult,
  SearchStockStatus,
} from '../../../shared-kernel/application/ports/product-search-index.port';
import type { CatalogSearchAttribute } from '../../../shared-kernel/application/ports/catalog-offer-search-source.port';
export type { CatalogSearchAttribute };

export type OfferSearchSource = {
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
  readonly stockAvailable?: number | null;
  readonly primaryImageMediaId?: string | null;
  readonly updatedAt: Date;
  readonly version: number;
};
