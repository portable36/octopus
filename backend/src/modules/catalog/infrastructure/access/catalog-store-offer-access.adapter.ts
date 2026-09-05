import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import type {
  CatalogStoreOfferAccessPort,
  CatalogStoreOfferSnapshot,
  StoreVariantPair,
} from '../../../../shared-kernel/application/ports/catalog-store-offer-access.port';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import { ProductOrmEntity } from '../persistence/product.orm-entity';
import { StoreOfferOrmEntity } from '../persistence/store-offer.orm-entity';
import { VariantOrmEntity } from '../persistence/variant.orm-entity';

@Injectable()
export class CatalogStoreOfferAccessAdapter implements CatalogStoreOfferAccessPort {
  constructor(private readonly em: EntityManager) {}

  public async findByStoreAndVariant(
    storeId: string,
    variantId: string,
  ): Promise<CatalogStoreOfferSnapshot | null> {
    const [offer] = await this.findManyByStoreAndVariant([{ storeId, variantId }]);
    return offer ?? null;
  }

  public async findManyByStoreAndVariant(
    pairs: readonly StoreVariantPair[],
  ): Promise<readonly CatalogStoreOfferSnapshot[]> {
    if (pairs.length === 0) {
      return [];
    }
    const unique = new Map<string, StoreVariantPair>();
    for (const pair of pairs) {
      unique.set(`${pair.storeId}:${pair.variantId}`, pair);
    }
    const uniquePairs = [...unique.values()];
    return withRlsContext(this.em, async (tx) => {
      const entities = await tx.find(StoreOfferOrmEntity, {
        $or: uniquePairs.map((pair) => ({
          storeId: pair.storeId,
          variantId: pair.variantId,
        })),
      });
      if (entities.length === 0) {
        return [];
      }
      const productIds = [...new Set(entities.map((e) => e.productId))];
      const variantIds = [...new Set(entities.map((e) => e.variantId))];
      const [products, variants] = await Promise.all([
        tx.find(ProductOrmEntity, { id: { $in: productIds } }),
        tx.find(VariantOrmEntity, { id: { $in: variantIds } }),
      ]);
      const productMap = new Map(products.map((p) => [p.id, p]));
      const variantMap = new Map(variants.map((v) => [v.id, v]));

      return entities.map((entity) => {
        const product = productMap.get(entity.productId);
        const variant = variantMap.get(entity.variantId);
        const productStatus = product?.status ?? 'unknown';
        const variantStatus = variant?.status ?? 'unknown';
        const isSellable =
          entity.status === 'active' &&
          entity.isAvailable &&
          productStatus === 'published' &&
          variantStatus === 'ACTIVE';

        return {
          offerId: entity.id,
          vendorId: entity.vendorId,
          storeId: entity.storeId,
          productId: entity.productId,
          variantId: entity.variantId,
          priceMinor: entity.priceMinor,
          currencyCode: entity.currencyCode,
          status: entity.status,
          isAvailable: entity.isAvailable,
          productStatus,
          variantStatus,
          isSellable,
        };
      });
    });
  }
}
