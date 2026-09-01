import type { OfferSearchDocument, OfferSearchSource, SearchStockStatus } from '../search.types';

export function resolveStockStatus(available: number | null | undefined): SearchStockStatus {
  if (available === null || available === undefined) {
    return 'UNKNOWN';
  }
  return available > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK';
}

/** Pure mapper — Catalog/Inventory truth → search document (no Meili SDK). */
export function buildOfferSearchDocument(source: OfferSearchSource): OfferSearchDocument {
  const searchable =
    source.productStatus === 'published' &&
    source.offerStatus === 'active' &&
    source.offerAvailable;

  return {
    id: source.offerId,
    offerId: source.offerId,
    productId: source.productId,
    variantId: source.variantId,
    vendorId: source.vendorId,
    storeId: source.storeId,
    name: source.name.trim(),
    slug: source.slug.trim(),
    sku: source.sku.trim(),
    shortDescription: (source.shortDescription ?? '').trim(),
    brandId: source.brandId ?? null,
    categoryIds: [...(source.categoryIds ?? [])],
    priceMinor: source.priceMinor,
    currencyCode: source.currencyCode.trim().toUpperCase(),
    stockStatus: resolveStockStatus(source.stockAvailable),
    offerStatus: source.offerStatus,
    productStatus: source.productStatus,
    primaryImageMediaId: source.primaryImageMediaId ?? null,
    searchable,
    updatedAtUnix: Math.floor(source.updatedAt.getTime() / 1000),
    version: source.version,
  };
}
