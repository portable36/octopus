import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type { WarehouseRepository } from '../../application/ports/warehouse-repository.interface';
import type { Warehouse } from '../../domain/aggregates/warehouse.aggregate';
import { applyWarehouseToOrm, warehouseToDomain } from './warehouse.mapper';
import { WarehouseOrmEntity } from './warehouse.orm-entity';

@Injectable()
export class WarehouseRepositoryAdapter implements WarehouseRepository {
  constructor(private readonly em: EntityManager) {}

  public async save(warehouse: Warehouse): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      const existing = await tx.findOne(WarehouseOrmEntity, { id: warehouse.id.value });
      const entity = existing ?? new WarehouseOrmEntity();
      applyWarehouseToOrm(warehouse, entity);
      await tx.persist(entity).flush();
    });
  }

  public async findById(id: string): Promise<Warehouse | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(WarehouseOrmEntity, { id });
      return entity ? warehouseToDomain(entity) : null;
    });
  }

  public async findByStoreId(storeId: string): Promise<Warehouse[]> {
    return withRlsContext(this.em, async (tx) => {
      const entities = await tx.find(WarehouseOrmEntity, { storeId });
      return entities.map(warehouseToDomain);
    });
  }

  public async findByStoreAndCode(storeId: string, code: string): Promise<Warehouse | null> {
    return withRlsContext(this.em, async (tx) => {
      const entity = await tx.findOne(WarehouseOrmEntity, {
        storeId,
        code: code.trim().toUpperCase(),
      });
      return entity ? warehouseToDomain(entity) : null;
    });
  }
}
