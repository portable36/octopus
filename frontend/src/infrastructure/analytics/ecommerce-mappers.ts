import type { CartLine } from '@/lib/cart-api';
import type { PublicProduct } from '@/lib/storefront-api';
import { minorToMajor, type ECommerceItem } from './dataLayer';

export function itemFromProductOffer(
  product: PublicProduct,
  offerId?: string,
  variantId?: string,
  quantity = 1,
  context?: {
    readonly itemListName?: string;
    readonly itemCategory?: string;
  },
): ECommerceItem | null {
  const offer =
    (offerId ? product.offers.find((entry) => entry.id === offerId) : undefined) ??
    (variantId ? product.offers.find((entry) => entry.variantId === variantId) : undefined) ??
    product.offers.find((entry) => entry.isAvailable) ??
    product.offers[0];

  if (!offer) {
    return null;
  }

  const variant = product.variants.find((entry) => entry.id === offer.variantId);

  return {
    id: product.id,
    name: product.name,
    price: minorToMajor(offer.priceMinor),
    sku: variant?.sku ?? product.slug,
    ...(product.brandId ? { brand: product.brandId } : {}),
    ...(context?.itemCategory || product.categoryIds[0]
      ? { category: context?.itemCategory ?? product.categoryIds[0] }
      : {}),
    ...(context?.itemListName ? { itemListName: context.itemListName } : {}),
    quantity,
  };
}

export function itemsFromCartLines(lines: readonly CartLine[]): readonly ECommerceItem[] {
  return lines.map((line) => ({
    id: line.productId,
    name: line.productId,
    price: minorToMajor(line.unitPriceSnapshotMinor),
    sku: line.variantId,
    quantity: line.quantity,
  }));
}

export function cartLinesValueMinor(lines: readonly CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.unitPriceSnapshotMinor * line.quantity, 0);
}
