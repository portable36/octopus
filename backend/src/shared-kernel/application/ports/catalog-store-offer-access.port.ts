export const CATALOG_STORE_OFFER_ACCESS = Symbol('CATALOG_STORE_OFFER_ACCESS');

export interface CatalogStoreOfferSnapshot {
  readonly offerId: string;
  readonly vendorId: string;
  readonly storeId: string;
  readonly productId: string;
  readonly variantId: string;
  readonly priceMinor: number;
  readonly currencyCode: string;
  readonly status: string;
  readonly isAvailable: boolean;
}

export interface CatalogStoreOfferAccessPort {
  findByStoreAndVariant(
    storeId: string,
    variantId: string,
  ): Promise<CatalogStoreOfferSnapshot | null>;
}
