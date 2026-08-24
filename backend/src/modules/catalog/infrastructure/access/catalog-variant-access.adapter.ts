import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import type {
  CatalogVariantAccessPort,
  CatalogVariantAccessSnapshot,
} from '../../../../shared-kernel/application/ports/catalog-variant-access.port';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import { VariantOrmEntity } from '../../../catalog/infrastructure/persistence/variant.orm-entity';

/**
 * Catalog adapter living in inventory infrastructure would violate module boundaries.
 * This adapter is registered from CatalogModule and injected via shared-kernel port.
 */
@Injectable()
export class CatalogVariantAccessAdapter implements CatalogVariantAccessPort {
  constructor(private readonly em: EntityManager) {}

  public async findById(variantId: string): Promise<CatalogVariantAccessSnapshot | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(VariantOrmEntity, { id: variantId });
      if (!entity) {
        return null;
      }
      return {
        variantId: entity.id,
        productId: entity.productId,
        vendorId: entity.vendorId,
        sku: entity.sku,
        status: entity.status,
      };
    });
  }
}
