import type { Product } from '../../domain/aggregates/product.aggregate';
import type { StoreOffer } from '../../domain/aggregates/store-offer.aggregate';
import type { Variant } from '../../domain/aggregates/variant.aggregate';
import type {
  AuthoringProductDto,
  AuthoringStoreOfferDto,
  AuthoringVariantDto,
  CatalogMediaRefDto,
  CatalogMediaWithUrlDto,
  StorefrontOfferDto,
  StorefrontProductDto,
  StorefrontVariantDto,
} from '../contracts/catalog-contracts';

export function toAuthoringProductDto(product: Product): AuthoringProductDto {
  return {
    id: product.id.value,
    vendorId: product.vendorId,
    sku: product.sku,
    name: product.name,
    description: product.description,
    brandId: product.brandId,
    categoryIds: product.categoryIds,
    status: product.status,
    attributes: product.attributes,
    media: product.media as readonly CatalogMediaRefDto[],
    variantIds: product.variantIds,
  };
}

export function toAuthoringVariantDto(variant: Variant): AuthoringVariantDto {
  return {
    id: variant.id.value,
    productId: variant.productId,
    sku: variant.sku,
    name: variant.name,
    status: variant.status,
    barcode: variant.barcode ?? null,
    weightGrams: variant.weight?.grams ?? null,
    dimensions: variant.dimensions
      ? {
          lengthMillimeters: variant.dimensions.lengthMillimeters,
          widthMillimeters: variant.dimensions.widthMillimeters,
          heightMillimeters: variant.dimensions.heightMillimeters,
        }
      : null,
    basePriceMinor: variant.basePrice?.amountMinorUnits ?? null,
    currencyCode: variant.currency ?? null,
    attributes: variant.attributes,
    media: variant.media as readonly CatalogMediaRefDto[],
  };
}

export function toAuthoringStoreOfferDto(offer: StoreOffer): AuthoringStoreOfferDto {
  return {
    id: offer.id.value,
    vendorId: offer.vendorId,
    storeId: offer.storeId,
    productId: offer.productId,
    variantId: offer.variantId,
    priceMinor: offer.priceMinor,
    currencyCode: offer.currencyCode,
    status: offer.status,
    isAvailable: offer.isAvailable,
  };
}

export function toStorefrontProductDto(input: {
  readonly product: Product;
  readonly variants: readonly Variant[];
  readonly offers: readonly StoreOffer[];
  readonly slug: string;
  readonly mediaUrls: ReadonlyMap<string, string | null>;
}): StorefrontProductDto {
  const withUrls = (media: readonly CatalogMediaRefDto[]): readonly CatalogMediaWithUrlDto[] =>
    media.map((item) => ({
      ...item,
      url: input.mediaUrls.get(item.mediaId) ?? null,
    }));

  const variants: StorefrontVariantDto[] = input.variants.map((variant) => ({
    id: variant.id.value,
    sku: variant.sku,
    name: variant.name,
    status: variant.status,
    attributes: variant.attributes,
    media: variant.media.map((item, index) => ({
      mediaId: item.mediaId,
      mediaType: item.mediaType,
      isPrimary: item.isPrimary,
      sortOrder: index,
      url: input.mediaUrls.get(item.mediaId) ?? null,
    })),
  }));

  const offers: StorefrontOfferDto[] = input.offers.map((offer) => ({
    id: offer.id.value,
    storeId: offer.storeId,
    variantId: offer.variantId,
    priceMinor: offer.priceMinor,
    currencyCode: offer.currencyCode,
    isAvailable: offer.isAvailable,
  }));

  return {
    id: input.product.id.value,
    vendorId: input.product.vendorId,
    name: input.product.name,
    description: input.product.description,
    brandId: input.product.brandId,
    categoryIds: input.product.categoryIds,
    slug: input.slug,
    media: withUrls(input.product.media as readonly CatalogMediaRefDto[]),
    variants,
    offers,
  };
}
