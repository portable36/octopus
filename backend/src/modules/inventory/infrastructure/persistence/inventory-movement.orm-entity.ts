import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import type { InventoryOperationType, InventoryReferenceType } from '../../domain/inventory.types';

@Entity({ tableName: 'inventory_movements' })
export class InventoryMovementOrmEntity {
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

  @Property({ fieldName: 'operation_type' })
  operationType!: InventoryOperationType;

  @Property({ type: 'integer' })
  quantity!: number;

  @Property({ fieldName: 'before_quantity', type: 'integer' })
  beforeQuantity!: number;

  @Property({ fieldName: 'after_quantity', type: 'integer' })
  afterQuantity!: number;

  @Property({ fieldName: 'reference_type' })
  referenceType!: InventoryReferenceType;

  @Property({ fieldName: 'reference_id' })
  referenceId!: string;

  @Property({ fieldName: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId: string | null = null;

  @Property({ type: 'text', nullable: true })
  reason: string | null = null;

  @Property({ fieldName: 'correlation_id', nullable: true })
  correlationId: string | null = null;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;
}
