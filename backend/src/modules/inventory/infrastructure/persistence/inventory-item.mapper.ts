import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { InventoryItem } from '../../domain/aggregates/inventory-item.aggregate';
import { StockQuantity } from '../../domain/value-objects/stock-quantity.vo';
import { InventoryItemOrmEntity } from './inventory-item.orm-entity';

export function inventoryItemToDomain(entity: InventoryItemOrmEntity): InventoryItem {
  return InventoryItem.reconstitute(UniqueID.from(entity.id), {
    vendorId: entity.vendorId,
    storeId: entity.storeId,
    warehouseId: entity.warehouseId,
    variantId: entity.variantId,
    onHand: StockQuantity.of(entity.onHand),
    reserved: StockQuantity.of(entity.reserved),
    lowStockThreshold: StockQuantity.of(entity.lowStockThreshold),
    status: entity.status,
    version: entity.version,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  });
}

export function applyInventoryItemToOrm(item: InventoryItem, entity: InventoryItemOrmEntity): void {
  const props = item.toProps();
  entity.id = item.id.value;
  entity.vendorId = props.vendorId;
  entity.storeId = props.storeId;
  entity.warehouseId = props.warehouseId;
  entity.variantId = props.variantId;
  entity.onHand = props.onHand.value;
  entity.reserved = props.reserved.value;
  entity.lowStockThreshold = props.lowStockThreshold.value;
  entity.status = props.status;
  entity.version = props.version;
  entity.createdAt = props.createdAt;
  entity.updatedAt = props.updatedAt;
}
