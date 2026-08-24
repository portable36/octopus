import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type { VendorRepository } from '../../application/ports/vendor-repository.interface';
import type { Vendor } from '../../domain/aggregates/vendor.aggregate';
import { applyToOrm, toDomain } from './vendor.mapper';
import { VendorOrmEntity } from './vendor.orm-entity';

@Injectable()
export class VendorRepositoryAdapter implements VendorRepository {
  constructor(private readonly em: EntityManager) {}

  public async save(vendor: Vendor): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const existing = await tx.findOne(
        VendorOrmEntity,
        { id: vendor.id.value },
        { populate: ['staff'] },
      );
      const entity = existing ?? new VendorOrmEntity();
      applyToOrm(vendor, entity);
      await tx.persist(entity).flush();
    });
  }

  public async findById(id: string): Promise<Vendor | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(VendorOrmEntity, { id }, { populate: ['staff'] });
      return entity ? toDomain(entity) : null;
    });
  }

  public async findBySlug(slug: string): Promise<Vendor | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(VendorOrmEntity, { slug }, { populate: ['staff'] });
      return entity ? toDomain(entity) : null;
    });
  }

  public async findByOwnerUserId(userId: string): Promise<Vendor[]> {
    return withRlsContext(this.em, async (tx) => {
      const entities = await tx.find(
        VendorOrmEntity,
        { ownerUserId: userId },
        { populate: ['staff'] },
      );
      return entities.map(toDomain);
    });
  }

  public async findByStaffUserId(userId: string): Promise<Vendor[]> {
    return withRlsContext(this.em, async (tx) => {
      const entities = await tx.find(
        VendorOrmEntity,
        { staff: { userId } },
        { populate: ['staff'] },
      );
      return entities.map(toDomain);
    });
  }

  public async listAll(): Promise<Vendor[]> {
    return withRlsContext(this.em, async (tx) => {
      const entities = await tx.find(VendorOrmEntity, {}, { populate: ['staff'] });
      return entities.map(toDomain);
    });
  }

  public async existsBySlug(slug: string): Promise<boolean> {
    return withRlsContext(this.em, async (tx) => {
      const count = await tx.count(VendorOrmEntity, { slug });
      return count > 0;
    });
  }
}
