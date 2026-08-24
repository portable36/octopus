import type { Warehouse } from '../../domain/aggregates/warehouse.aggregate';

export const WAREHOUSE_REPOSITORY = Symbol('WAREHOUSE_REPOSITORY');

export interface WarehouseRepository {
  save(warehouse: Warehouse): Promise<void>;
  findById(id: string): Promise<Warehouse | null>;
  findByStoreId(storeId: string): Promise<Warehouse[]>;
  findByStoreAndCode(storeId: string, code: string): Promise<Warehouse | null>;
}
