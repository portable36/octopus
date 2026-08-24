export const CATALOG_VARIANT_ACCESS = Symbol('CATALOG_VARIANT_ACCESS');

export interface CatalogVariantAccessSnapshot {
  readonly variantId: string;
  readonly productId: string;
  readonly vendorId: string;
  readonly sku: string;
  readonly status: string;
}

export interface CatalogVariantAccessPort {
  findById(variantId: string): Promise<CatalogVariantAccessSnapshot | null>;
}
