import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import type { ReservationStatus } from '../../domain/inventory.types';

@Entity({ tableName: 'inventory_reservations' })
export class InventoryReservationOrmEntity {
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

  @Property({ fieldName: 'inventory_item_id', type: 'uuid' })
  inventoryItemId!: string;

  @Property({ fieldName: 'order_id' })
  orderId!: string;

  @Property({ type: 'integer' })
  quantity!: number;

  @Property()
  status!: ReservationStatus;

  @Property({ fieldName: 'expires_at' })
  expiresAt!: Date;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'updated_at' })
  updatedAt!: Date;
}
