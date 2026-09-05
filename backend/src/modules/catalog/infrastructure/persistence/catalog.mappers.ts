import { Money } from '../../../../shared-kernel/domain/money.value-object';
import { Product } from '../../domain/aggregates/product.aggregate';
import { Variant } from '../../domain/aggregates/variant.aggregate';
import { Category } from '../../domain/aggregates/category.aggregate';
import { StoreOffer } from '../../domain/aggregates/store-offer.aggregate';
import { Dimensions } from '../../domain/value-objects/dimensions.value-object';
import { Weight } from '../../domain/value-objects/weight.value-object';
import type { CatalogAttributeAssignment, CatalogMediaReference } from '../../domain/catalog.types';
import type {
  VariantAttributeAssignment,
  VariantExternalReference,
  VariantMediaReference,
} from '../../domain/aggregates/variant.aggregate';
import { ProductOrmEntity } from './product.orm-entity';
import { VariantOrmEntity } from './variant.orm-entity';
import { CategoryOrmEntity } from './category.orm-entity';
import { StoreOfferOrmEntity } from './store-offer.orm-entity';

export function productToDomain(entity: ProductOrmEntity): Product {
  return Product.rehydrate({
    id: entity.id,
    vendorId: entity.vendorId,
    sku: entity.sku,
    name: entity.name,
    description: entity.description,
    brandId: entity.brandId,
    categoryIds: entity.categoryIds,
    status: entity.status,
    attributes: entity.attributes as CatalogAttributeAssignment[],
    media: entity.media as CatalogMediaReference[],
    variantIds: entity.variantIds,
  });
}

export function applyProductToOrm(product: Product, entity: ProductOrmEntity): void {
  entity.id = product.id.value;
  entity.vendorId = product.vendorId;
  entity.sku = product.sku;
  entity.name = product.name;
  entity.description = product.description;
  entity.brandId = product.brandId;
  entity.categoryIds = [...product.categoryIds];
  entity.status = product.status;
  entity.attributes = [...product.attributes];
  entity.media = [...product.media];
  entity.variantIds = [...product.variantIds];
  entity.updatedAt = new Date();
  if (!entity.createdAt) entity.createdAt = new Date();
}

export function variantToDomain(entity: VariantOrmEntity): Variant {
  const currency = entity.currencyCode ?? 'BDT';
  return Variant.rehydrate({
    id: entity.id,
    productId: entity.productId,
    sku: entity.sku,
    name: entity.name,
    ...(entity.barcode ? { barcode: entity.barcode } : {}),
    ...(entity.gtin ? { gtin: entity.gtin } : {}),
    ...(entity.ean ? { ean: entity.ean } : {}),
    ...(entity.upc ? { upc: entity.upc } : {}),
    ...(entity.mpn ? { mpn: entity.mpn } : {}),
    ...(entity.manufacturerReference
      ? { manufacturerReference: entity.manufacturerReference }
      : {}),
    ...(entity.costPriceMinor !== null
      ? { costPrice: Money.create(entity.costPriceMinor, currency) }
      : {}),
    ...(entity.basePriceMinor !== null
      ? { basePrice: Money.create(entity.basePriceMinor, currency) }
      : {}),
    ...(entity.compareAtPriceMinor !== null
      ? { compareAtPrice: Money.create(entity.compareAtPriceMinor, currency) }
      : {}),
    ...(entity.weightGrams !== null && entity.weightGrams !== undefined
      ? { weight: Weight.create(entity.weightGrams) }
      : {}),
    ...(entity.lengthMm !== null &&
    entity.lengthMm !== undefined &&
    entity.widthMm !== null &&
    entity.widthMm !== undefined &&
    entity.heightMm !== null &&
    entity.heightMm !== undefined
      ? {
          dimensions: Dimensions.create({
            lengthMillimeters: entity.lengthMm,
            widthMillimeters: entity.widthMm,
            heightMillimeters: entity.heightMm,
          }),
        }
      : {}),
    status: entity.status,
    attributes: entity.attributes as VariantAttributeAssignment[],
    media: entity.media as VariantMediaReference[],
    ...(entity.taxClassificationReference
      ? { taxClassificationReference: entity.taxClassificationReference }
      : {}),
    ...(entity.shippingClassificationReference
      ? { shippingClassificationReference: entity.shippingClassificationReference }
      : {}),
    externalReferences: entity.externalReferences as VariantExternalReference[],
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  });
}

export function applyVariantToOrm(
  variant: Variant,
  vendorId: string,
  entity: VariantOrmEntity,
): void {
  entity.id = variant.id.value;
  entity.vendorId = vendorId;
  entity.productId = variant.productId;
  entity.sku = variant.sku;
  entity.name = variant.name;
  entity.barcode = variant.barcode ?? null;
  entity.gtin = variant.gtin ?? null;
  entity.ean = variant.ean ?? null;
  entity.upc = variant.upc ?? null;
  entity.mpn = variant.mpn ?? null;
  entity.manufacturerReference = variant.manufacturerReference ?? null;
  entity.costPriceMinor = variant.costPrice?.amountMinorUnits ?? null;
  entity.basePriceMinor = variant.basePrice?.amountMinorUnits ?? null;
  entity.compareAtPriceMinor = variant.compareAtPrice?.amountMinorUnits ?? null;
  entity.currencyCode = variant.currency ?? null;
  entity.weightGrams = variant.weight?.grams ?? null;
  entity.lengthMm = variant.dimensions?.lengthMillimeters ?? null;
  entity.widthMm = variant.dimensions?.widthMillimeters ?? null;
  entity.heightMm = variant.dimensions?.heightMillimeters ?? null;
  entity.status = variant.status;
  entity.attributes = [...variant.attributes];
  entity.media = [...variant.media];
  entity.externalReferences = [...variant.externalReferences];
  entity.taxClassificationReference = variant.taxClassificationReference ?? null;
  entity.shippingClassificationReference = variant.shippingClassificationReference ?? null;
  entity.createdAt = variant.createdAt;
  entity.updatedAt = variant.updatedAt;
}

export function categoryToDomain(entity: CategoryOrmEntity): Category {
  return Category.rehydrate({
    id: entity.id,
    name: entity.name,
    slug: entity.slug,
    parentId: entity.parentId,
    status: entity.status,
    sortOrder: entity.sortOrder,
    seo: {
      title: entity.seoTitle,
      description: entity.seoDescription,
    },
  });
}

export function applyCategoryToOrm(category: Category, entity: CategoryOrmEntity): void {
  entity.id = category.id.value;
  entity.name = category.name;
  entity.slug = category.slug;
  entity.parentId = category.parentId;
  entity.status = category.status;
  entity.sortOrder = category.sortOrder;
  entity.seoTitle = category.seo.title;
  entity.seoDescription = category.seo.description;
  entity.updatedAt = new Date();
  if (!entity.createdAt) entity.createdAt = new Date();
}

export function offerToDomain(entity: StoreOfferOrmEntity): StoreOffer {
  return StoreOffer.rehydrate({
    id: entity.id,
    vendorId: entity.vendorId,
    storeId: entity.storeId,
    productId: entity.productId,
    variantId: entity.variantId,
    priceMinor: entity.priceMinor,
    currencyCode: entity.currencyCode,
    status: entity.status,
    isAvailable: entity.isAvailable,
  });
}

export function applyOfferToOrm(offer: StoreOffer, entity: StoreOfferOrmEntity): void {
  entity.id = offer.id.value;
  entity.vendorId = offer.vendorId;
  entity.storeId = offer.storeId;
  entity.productId = offer.productId;
  entity.variantId = offer.variantId;
  entity.priceMinor = offer.priceMinor;
  entity.currencyCode = offer.currencyCode;
  entity.status = offer.status;
  entity.isAvailable = offer.isAvailable;
  entity.updatedAt = new Date();
  if (!entity.createdAt) entity.createdAt = new Date();
}
