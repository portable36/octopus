import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import type {
  CatalogStoreOfferAccessPort,
  CatalogStoreOfferSnapshot,
  StoreVariantPair,
} from '../../../../shared-kernel/application/ports/catalog-store-offer-access.port';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import { StoreOfferOrmEntity } from '../persistence/store-offer.orm-entity';

function toSnapshot(entity: StoreOfferOrmEntity): CatalogStoreOfferSnapshot {
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
  };
}

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
      return entities.map(toSnapshot);
    });
  }
}
