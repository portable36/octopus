import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import type {
  CatalogOfferSearchSourceDto,
  CatalogOfferSearchSourcePort,
} from '../../../../shared-kernel/application/ports/catalog-offer-search-source.port';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import { ProductOrmEntity } from '../persistence/product.orm-entity';
import { StoreOfferOrmEntity } from '../persistence/store-offer.orm-entity';
import { VariantOrmEntity } from '../persistence/variant.orm-entity';

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.length > 0 ? slug : 'offer';
}

@Injectable()
export class CatalogOfferSearchSourceAdapter implements CatalogOfferSearchSourcePort {
  constructor(private readonly em: EntityManager) {}

  public async loadOfferSource(offerId: string): Promise<CatalogOfferSearchSourceDto | null> {
    return withRlsContext(this.em, async (tx) => {
      const offer = await tx.findOne(StoreOfferOrmEntity, { id: offerId });
      if (!offer) {
        return null;
      }
      const product = await tx.findOne(ProductOrmEntity, { id: offer.productId });
      const variant = await tx.findOne(VariantOrmEntity, { id: offer.variantId });
      if (!product || !variant) {
        return null;
      }
      const updatedAt = offer.updatedAt ?? product.updatedAt ?? new Date();
      return {
        offerId: offer.id,
        productId: offer.productId,
        variantId: offer.variantId,
        vendorId: offer.vendorId,
        storeId: offer.storeId,
        name: product.name,
        slug: slugify(product.name),
        sku: variant.sku,
        shortDescription: product.description,
        brandId: product.brandId,
        categoryIds: product.categoryIds ?? [],
        priceMinor: offer.priceMinor,
        currencyCode: offer.currencyCode,
        offerStatus: offer.status,
        offerAvailable: offer.isAvailable,
        productStatus: product.status,
        updatedAt,
        version: Math.floor(updatedAt.getTime() / 1000),
      };
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
