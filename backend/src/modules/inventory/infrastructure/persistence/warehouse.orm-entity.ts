import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import type { WarehouseStatus } from '../../domain/inventory.types';

@Entity({ tableName: 'inventory_warehouses' })
@Unique({ properties: ['storeId', 'code'] })
export class WarehouseOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'vendor_id', type: 'uuid' })
  vendorId!: string;

  @Property({ fieldName: 'store_id', type: 'uuid' })
  storeId!: string;

  @Property()
  code!: string;

  @Property()
  name!: string;

  @Property()
  status!: WarehouseStatus;

  @Property({ fieldName: 'address_line', nullable: true })
  addressLine: string | null = null;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'updated_at' })
  updatedAt!: Date;
}
