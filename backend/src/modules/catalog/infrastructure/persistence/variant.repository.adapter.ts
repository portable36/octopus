import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type { VariantRepository } from '../../application/ports/variant-repository.interface';
import type { Variant } from '../../domain/aggregates/variant.aggregate';
import { applyVariantToOrm, variantToDomain } from './catalog.mappers';
import { ProductOrmEntity } from './product.orm-entity';
import { VariantOrmEntity } from './variant.orm-entity';

@Injectable()
export class VariantRepositoryAdapter implements VariantRepository {
  constructor(private readonly em: EntityManager) {}

  public async save(variant: Variant): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const product = await tx.findOne(ProductOrmEntity, { id: variant.productId });
      if (!product) {
        throw new Error('Cannot persist variant without parent product.');
      }
      const existing = await tx.findOne(VariantOrmEntity, { id: variant.id.value });
      const entity = existing ?? new VariantOrmEntity();
      applyVariantToOrm(variant, product.vendorId, entity);
      await tx.persist(entity).flush();
    });
  }

  public async findById(id: string): Promise<Variant | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(VariantOrmEntity, { id });
      return entity ? variantToDomain(entity) : null;
    });
  }

  public async findByProductId(productId: string): Promise<Variant[]> {
    return withRlsContext(this.em, async (tx) => {
      const entities = await tx.find(VariantOrmEntity, { productId });
      return entities.map(variantToDomain);
    });
  }

  public async findByVendorAndSku(vendorId: string, sku: string): Promise<Variant | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(VariantOrmEntity, { vendorId, sku });
      return entity ? variantToDomain(entity) : null;
    });
  }

  public async existsByVendorAndSku(vendorId: string, sku: string): Promise<boolean> {
    return withRlsContext(this.em, async (tx) => {
      const count = await tx.count(VariantOrmEntity, { vendorId, sku });
      return count > 0;
    });
  }
}
