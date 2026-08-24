import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import type {
  CatalogStoreOfferAccessPort,
  CatalogStoreOfferSnapshot,
} from '../../../../shared-kernel/application/ports/catalog-store-offer-access.port';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import { StoreOfferOrmEntity } from '../persistence/store-offer.orm-entity';

@Injectable()
export class CatalogStoreOfferAccessAdapter implements CatalogStoreOfferAccessPort {
  constructor(private readonly em: EntityManager) {}

  public async findByStoreAndVariant(
    storeId: string,
    variantId: string,
  ): Promise<CatalogStoreOfferSnapshot | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(StoreOfferOrmEntity, { storeId, variantId });
      if (!entity) {
        return null;
      }
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
    });
  }
}
