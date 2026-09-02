import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import type {
  CatalogOfferSearchSourceDto,
  CatalogOfferSearchSourcePort,
  CatalogSearchAttribute,
} from '../../../../shared-kernel/application/ports/catalog-offer-search-source.port';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import { CategoryOrmEntity } from '../persistence/category.orm-entity';
import { ProductOrmEntity } from '../persistence/product.orm-entity';
import { StoreOfferOrmEntity } from '../persistence/store-offer.orm-entity';
import { VariantOrmEntity } from '../persistence/variant.orm-entity';
import { resolvePrimaryImageMediaId } from '../../domain/services/resolve-primary-image-media-id';
import type { CatalogMediaReference } from '../../domain/catalog.types';

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.length > 0 ? slug : 'offer';
}

function parseSearchAttributes(raw: readonly unknown[]): CatalogSearchAttribute[] {
  const attributes: CatalogSearchAttribute[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const record = entry as Record<string, unknown>;
    if (typeof record['code'] !== 'string' || record['value'] === undefined) {
      continue;
    }
    attributes.push({
      code: record['code'],
      value: record['value'] as CatalogSearchAttribute['value'],
    });
  }
  return attributes;
}

function toSearchSource(
  offer: StoreOfferOrmEntity,
  product: ProductOrmEntity,
  variant: VariantOrmEntity,
  categoryNames: readonly string[],
): CatalogOfferSearchSourceDto {
  const updatedAt = offer.updatedAt ?? product.updatedAt ?? new Date();
  return {
    offerId: offer.id,
    productId: offer.productId,
    variantId: offer.variantId,
    vendorId: offer.vendorId,
    storeId: offer.storeId,
    name: product.name,
    variantName: variant.name,
    slug: slugify(product.name),
    sku: variant.sku,
    shortDescription: product.description,
    brandId: product.brandId,
    categoryIds: product.categoryIds ?? [],
    categoryNames,
    productAttributes: parseSearchAttributes(product.attributes ?? []),
    variantAttributes: parseSearchAttributes(variant.attributes ?? []),
    reviewTexts: [],
    priceMinor: offer.priceMinor,
    currencyCode: offer.currencyCode,
    offerStatus: offer.status,
    offerAvailable: offer.isAvailable,
    productStatus: product.status,
    primaryImageMediaId: resolvePrimaryImageMediaId(
      (product.media ?? []) as readonly CatalogMediaReference[],
    ),
    updatedAt,
    version: Math.floor(updatedAt.getTime() / 1000),
  };
}

@Injectable()
export class CatalogOfferSearchSourceAdapter implements CatalogOfferSearchSourcePort {
  constructor(private readonly em: EntityManager) {}

  public async loadOfferSource(offerId: string): Promise<CatalogOfferSearchSourceDto | null> {
    const [source] = await this.loadOfferSources([offerId]);
    return source ?? null;
  }

  public async loadOfferSources(
    offerIds: readonly string[],
  ): Promise<readonly CatalogOfferSearchSourceDto[]> {
    const uniqueIds = [...new Set(offerIds.filter((id) => id.length > 0))];
    if (uniqueIds.length === 0) {
      return [];
    }
    return withRlsContext(this.em, async (tx) => {
      const offers = await tx.find(StoreOfferOrmEntity, { id: { $in: uniqueIds } });
      if (offers.length === 0) {
        return [];
      }
      const productIds = [...new Set(offers.map((offer) => offer.productId))];
      const variantIds = [...new Set(offers.map((offer) => offer.variantId))];
      const [products, variants] = await Promise.all([
        tx.find(ProductOrmEntity, { id: { $in: productIds } }),
        tx.find(VariantOrmEntity, { id: { $in: variantIds } }),
      ]);
      const categoryIds = [...new Set(products.flatMap((product) => product.categoryIds ?? []))];
      const categories =
        categoryIds.length > 0
          ? await tx.find(CategoryOrmEntity, { id: { $in: categoryIds } })
          : [];
      const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
      const productsById = new Map(products.map((product) => [product.id, product]));
      const variantsById = new Map(variants.map((variant) => [variant.id, variant]));
      const sources: CatalogOfferSearchSourceDto[] = [];
      for (const offer of offers) {
        const product = productsById.get(offer.productId);
        const variant = variantsById.get(offer.variantId);
        if (!product || !variant) {
          continue;
        }
        const categoryNames = (product.categoryIds ?? [])
          .map((categoryId) => categoryNameById.get(categoryId))
          .filter((name): name is string => Boolean(name));
        sources.push(toSearchSource(offer, product, variant, categoryNames));
      }
      return sources;
    });
  }

  public async listOfferIdsByProductId(productId: string): Promise<readonly string[]> {
    return withRlsContext(this.em, async (tx) => {
      const rows = await tx.find(StoreOfferOrmEntity, { productId }, { fields: ['id'] });
      return rows.map((row) => row.id);
    });
  }

  public async listOfferIdsByVariantId(variantId: string): Promise<readonly string[]> {
    return withRlsContext(this.em, async (tx) => {
      const rows = await tx.find(StoreOfferOrmEntity, { variantId }, { fields: ['id'] });
      return rows.map((row) => row.id);
    });
  }

  public async listOfferIdsByStoreAndVariant(
    storeId: string,
    variantId: string,
  ): Promise<readonly string[]> {
    return withRlsContext(this.em, async (tx) => {
      const rows = await tx.find(StoreOfferOrmEntity, { storeId, variantId }, { fields: ['id'] });
      return rows.map((row) => row.id);
    });
  }

  public async listOfferIdsPage(
    afterId: string | null,
    limit: number,
  ): Promise<{
    readonly offerIds: readonly string[];
    readonly nextAfterId: string | null;
  }> {
    const take = Math.min(200, Math.max(1, limit));
    return withRlsContext(this.em, async (tx) => {
      const rows = await tx.find(StoreOfferOrmEntity, afterId ? { id: { $gt: afterId } } : {}, {
        fields: ['id'],
        orderBy: { id: 'asc' },
        limit: take,
      });
      const offerIds = rows.map((row) => row.id);
      const nextAfterId = offerIds.length === take ? (offerIds[offerIds.length - 1] ?? null) : null;
      return { offerIds, nextAfterId };
    });
  }
}
