import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type { StoreRepository } from '../../application/ports/store-repository.interface';
import type { Store } from '../../domain/aggregates/store.aggregate';
import { applyToOrm, toDomain } from './store.mapper';
import { StoreOrmEntity } from './store.orm-entity';

@Injectable()
export class StoreRepositoryAdapter implements StoreRepository {
  constructor(private readonly em: EntityManager) {}

  public async save(store: Store): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const existing = await tx.findOne(
        StoreOrmEntity,
        { id: store.id.value },
        { populate: ['staff'] },
      );
      const entity = existing ?? new StoreOrmEntity();
      applyToOrm(store, entity);
      await tx.persist(entity).flush();
    });
  }

  public async findById(id: string): Promise<Store | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(StoreOrmEntity, { id }, { populate: ['staff'] });
      return entity ? toDomain(entity) : null;
    });
  }

  public async findByVendorId(vendorId: string): Promise<Store[]> {
    return withRlsContext(this.em, async (tx) => {
      const entities = await tx.find(StoreOrmEntity, { vendorId }, { populate: ['staff'] });
      return entities.map(toDomain);
    });
  }

  public async findByStaffUserId(userId: string): Promise<Store[]> {
    return withRlsContext(this.em, async (tx) => {
      const entities = await tx.find(
        StoreOrmEntity,
        { staff: { userId } },
        { populate: ['staff'] },
      );
      return entities.map(toDomain);
    });
  }

  public async listAll(): Promise<Store[]> {
    return withRlsContext(this.em, async (tx) => {
      const entities = await tx.find(StoreOrmEntity, {}, { populate: ['staff'] });
      return entities.map(toDomain);
    });
  }

  public async existsByVendorAndSlug(vendorId: string, slug: string): Promise<boolean> {
    return withRlsContext(this.em, async (tx) => {
      const count = await tx.count(StoreOrmEntity, { vendorId, slug });
      return count > 0;
    });
  }

  public async findActiveBySlug(slug: string, vendorId?: string): Promise<Store | null> {
    return withRlsContext(this.em, async (tx) => {
      const where: Record<string, unknown> = { slug, status: 'active' };
      if (vendorId) {
        where.vendorId = vendorId;
      }
      const entity = await tx.findOne(StoreOrmEntity, where, { populate: ['staff'] });
      return entity ? toDomain(entity) : null;
    });
  }
}
