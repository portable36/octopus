import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { InventoryReservation } from '../../domain/aggregates/inventory-reservation.aggregate';
import { StockQuantity } from '../../domain/value-objects/stock-quantity.vo';
import { InventoryReservationOrmEntity } from './inventory-reservation.orm-entity';

export function reservationToDomain(entity: InventoryReservationOrmEntity): InventoryReservation {
  return InventoryReservation.reconstitute(UniqueID.from(entity.id), {
    vendorId: entity.vendorId,
    storeId: entity.storeId,
    warehouseId: entity.warehouseId,
    variantId: entity.variantId,
    inventoryItemId: entity.inventoryItemId,
    orderId: entity.orderId,
    quantity: StockQuantity.of(entity.quantity),
    status: entity.status,
    expiresAt: entity.expiresAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  });
}

export function applyReservationToOrm(
  reservation: InventoryReservation,
  entity: InventoryReservationOrmEntity,
): void {
  const props = reservation.toProps();
  entity.id = reservation.id.value;
  entity.vendorId = props.vendorId;
  entity.storeId = props.storeId;
  entity.warehouseId = props.warehouseId;
  entity.variantId = props.variantId;
  entity.inventoryItemId = props.inventoryItemId;
  entity.orderId = props.orderId;
  entity.quantity = props.quantity.value;
  entity.status = props.status;
  entity.expiresAt = props.expiresAt;
  entity.createdAt = props.createdAt;
  entity.updatedAt = props.updatedAt;
}
