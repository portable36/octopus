import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type { StoreOfferRepository } from '../../application/ports/store-offer-repository.interface';
import type { StoreOffer } from '../../domain/aggregates/store-offer.aggregate';
import { applyOfferToOrm, offerToDomain } from './catalog.mappers';
import { appendCatalogOutbox } from './append-catalog-outbox';
import { StoreOfferOrmEntity } from './store-offer.orm-entity';

@Injectable()
export class StoreOfferRepositoryAdapter implements StoreOfferRepository {
  constructor(private readonly em: EntityManager) {}

  public async save(offer: StoreOffer): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const existing = await tx.findOne(StoreOfferOrmEntity, { id: offer.id.value });
      const entity = existing ?? new StoreOfferOrmEntity();
      applyOfferToOrm(offer, entity);
      await tx.persist(entity).flush();
      await appendCatalogOutbox(tx, offer.id.value, offer.getUncommittedEvents());
      offer.clearEvents();
    });
  }

  public async findById(id: string): Promise<StoreOffer | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(StoreOfferOrmEntity, { id });
      return entity ? offerToDomain(entity) : null;
    });
  }

  public async findByStoreId(storeId: string): Promise<StoreOffer[]> {
    return withRlsContext(this.em, async (tx) => {
      const entities = await tx.find(StoreOfferOrmEntity, { storeId });
      return entities.map(offerToDomain);
    });
  }

  public async findByStoreAndProductId(storeId: string, productId: string): Promise<StoreOffer[]> {
    return withRlsContext(this.em, async (tx) => {
      const entities = await tx.find(StoreOfferOrmEntity, { storeId, productId });
      return entities.map(offerToDomain);
    });
  }

  public async findByStoreAndVariant(
    storeId: string,
    variantId: string,
  ): Promise<StoreOffer | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(StoreOfferOrmEntity, { storeId, variantId });
      return entity ? offerToDomain(entity) : null;
    });
  }

  public async existsByStoreAndVariant(storeId: string, variantId: string): Promise<boolean> {
    return withRlsContext(this.em, async (tx) => {
      const count = await tx.count(StoreOfferOrmEntity, { storeId, variantId });
      return count > 0;
    });
  }

  public async findActiveByProductId(productId: string): Promise<StoreOffer[]> {
    return withRlsContext(this.em, async (tx) => {
      const entities = await tx.find(StoreOfferOrmEntity, { productId, status: 'active' });
      return entities.map(offerToDomain);
    });
  }
}
