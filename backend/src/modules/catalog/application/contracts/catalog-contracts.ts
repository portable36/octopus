/**
 * Canonical catalog DTO boundaries for authoring and storefront read models.
 *
 * Martvill `Product` / `ProductMeta` fields map into Octopus bounded contexts:
 * - Product identity, status, categories, brand → Catalog Product aggregate
 * - Variants (child products / variation meta) → Catalog Variant aggregate
 * - Store-specific price / availability → StoreOffer aggregate (+ Inventory for stock)
 * - Media file refs → Media module assets referenced by CatalogMediaReference
 * - SEO / extensible meta → product attributes + category seo (not a meta table)
 *
 * Inventory quantities and checkout totals are never embedded here.
 */

export type CatalogPublicationStatusDto =
  'draft' | 'pending_review' | 'published' | 'unpublished' | 'archived';

export type CatalogMediaTypeDto = 'IMAGE' | 'VIDEO' | 'DOCUMENT' | '360_VIEW';

export interface CatalogMediaRefDto {
  readonly mediaId: string;
  readonly mediaType: CatalogMediaTypeDto;
  readonly isPrimary: boolean;
  readonly sortOrder: number;
}

export interface CatalogMediaWithUrlDto extends CatalogMediaRefDto {
  readonly url: string | null;
}

export interface CatalogAttributeDto {
  readonly code: string;
  readonly value: string | number | boolean | readonly string[];
}

/** Vendor/admin authoring: product write and read (authenticated). */
export interface AuthoringProductDto {
  readonly id: string;
  readonly vendorId: string;
  readonly sku: string;
  readonly name: string;
  readonly description: string | null;
  readonly brandId: string | null;
  readonly categoryIds: readonly string[];
  readonly status: CatalogPublicationStatusDto;
  readonly attributes: readonly CatalogAttributeDto[];
  readonly media: readonly CatalogMediaRefDto[];
  readonly variantIds: readonly string[];
}

export interface AuthoringVariantDto {
  readonly id: string;
  readonly productId: string;
  readonly sku: string;
  readonly name: string;
  readonly status: string;
  readonly barcode: string | null;
  readonly basePriceMinor: number | null;
  readonly currencyCode: string | null;
  readonly attributes: readonly CatalogAttributeDto[];
  readonly media: readonly CatalogMediaRefDto[];
}

export interface AuthoringStoreOfferDto {
  readonly id: string;
  readonly vendorId: string;
  readonly storeId: string;
  readonly productId: string;
  readonly variantId: string;
  readonly priceMinor: number;
  readonly currencyCode: string;
  readonly status: string;
  readonly isAvailable: boolean;
}

/** Storefront read model: published product PDP (public, display-only). */
export interface StorefrontVariantDto {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly status: string;
  readonly attributes: readonly CatalogAttributeDto[];
  readonly media: readonly CatalogMediaWithUrlDto[];
}

export interface StorefrontOfferDto {
  readonly id: string;
  readonly storeId: string;
  readonly variantId: string;
  readonly priceMinor: number;
  readonly currencyCode: string;
  readonly isAvailable: boolean;
}

export interface StorefrontProductDto {
  readonly id: string;
  readonly vendorId: string;
  readonly name: string;
  readonly description: string | null;
  readonly brandId: string | null;
  readonly categoryIds: readonly string[];
  readonly slug: string;
  readonly media: readonly CatalogMediaWithUrlDto[];
  readonly variants: readonly StorefrontVariantDto[];
  readonly offers: readonly StorefrontOfferDto[];
}
