import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import type { InventoryItemStatus } from '../../domain/inventory.types';

@Entity({ tableName: 'inventory_items' })
@Unique({ properties: ['warehouseId', 'variantId'] })
export class InventoryItemOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'vendor_id', type: 'uuid' })
  vendorId!: string;

  @Property({ fieldName: 'store_id', type: 'uuid' })
  storeId!: string;

  @Property({ fieldName: 'warehouse_id', type: 'uuid' })
  warehouseId!: string;

  @Property({ fieldName: 'variant_id', type: 'uuid' })
  variantId!: string;

  @Property({ fieldName: 'on_hand', type: 'integer' })
  onHand!: number;

  @Property({ fieldName: 'reserved', type: 'integer' })
  reserved!: number;

  @Property({ fieldName: 'unsellable_on_hand', type: 'integer', default: 0 })
  unsellableOnHand = 0;

  @Property({ fieldName: 'low_stock_threshold', type: 'integer' })
  lowStockThreshold!: number;

  @Property()
  status!: InventoryItemStatus;

  @Property({ type: 'integer' })
  version!: number;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'updated_at' })
  updatedAt!: Date;
}
