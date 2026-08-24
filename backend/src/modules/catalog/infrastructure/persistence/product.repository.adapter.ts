import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type { ProductRepository } from '../../application/ports/product-repository.interface';
import type { Product } from '../../domain/aggregates/product.aggregate';
import { applyProductToOrm, productToDomain } from './catalog.mappers';
import { ProductOrmEntity } from './product.orm-entity';

@Injectable()
export class ProductRepositoryAdapter implements ProductRepository {
  constructor(private readonly em: EntityManager) {}

  public async save(product: Product): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const existing = await tx.findOne(ProductOrmEntity, { id: product.id.value });
      const entity = existing ?? new ProductOrmEntity();
      applyProductToOrm(product, entity);
      await tx.persist(entity).flush();
    });
  }

  public async findById(id: string): Promise<Product | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(ProductOrmEntity, { id });
      return entity ? productToDomain(entity) : null;
    });
  }

  public async findByVendorId(vendorId: string): Promise<Product[]> {
    return withRlsContext(this.em, async (tx) => {
      const entities = await tx.find(ProductOrmEntity, { vendorId });
      return entities.map(productToDomain);
    });
  }

  public async existsByVendorAndSku(vendorId: string, sku: string): Promise<boolean> {
    return withRlsContext(this.em, async (tx) => {
      const count = await tx.count(ProductOrmEntity, { vendorId, sku });
      return count > 0;
    });
  }
}
