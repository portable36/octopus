import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { Shipment } from '../../domain/aggregates/shipment.aggregate';
import type { ShipmentRecipientSnapshot } from '../../domain/fulfillment.types';
import { ShipmentLineOrmEntity, ShipmentOrmEntity } from './fulfillment.orm-entity';

export function shipmentToDomain(
  entity: ShipmentOrmEntity,
  lines: ShipmentLineOrmEntity[],
): Shipment {
  return Shipment.reconstitute(UniqueID.from(entity.id), {
    orderId: entity.orderId,
    orderNumber: entity.orderNumber,
    vendorId: entity.vendorId,
    storeId: entity.storeId,
    provider: entity.provider,
    status: entity.status,
    lines: Object.freeze(
      lines.map((line) => ({
        orderLineId: line.orderLineId,
        quantity: line.quantity,
      })),
    ),
    recipient: entity.recipientJson as unknown as ShipmentRecipientSnapshot,
    amountToCollectMinor: entity.amountToCollectMinor,
    currencyCode: entity.currencyCode,
    merchantOrderRef: entity.merchantOrderRef,
    providerConsignmentId: entity.providerConsignmentId,
    trackingCode: entity.trackingCode,
    providerStatus: entity.providerStatus,
    itemSummary: entity.itemSummary,
    weightKg: entity.weightKg,
    note: entity.note,
    version: entity.version,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  });
}

export function applyShipmentToOrm(
  shipment: Shipment,
  entity: ShipmentOrmEntity,
  idempotencyKey: string,
): void {
  entity.id = shipment.id.value;
  entity.orderId = shipment.orderId;
  entity.orderNumber = shipment.orderNumber;
  entity.vendorId = shipment.vendorId;
  entity.storeId = shipment.storeId;
  entity.provider = shipment.provider;
  entity.status = shipment.status;
  entity.amountToCollectMinor = shipment.amountToCollectMinor;
  entity.currencyCode = shipment.currencyCode;
  entity.merchantOrderRef = shipment.merchantOrderRef;
  entity.providerConsignmentId = shipment.providerConsignmentId;
  entity.trackingCode = shipment.trackingCode;
  entity.providerStatus = shipment.providerStatus;
  entity.recipientJson = { ...shipment.recipient };
  entity.itemSummary = shipment.itemSummary;
  entity.weightKg = shipment.weightKg;
  entity.note = shipment.note;
  entity.idempotencyKey = idempotencyKey;
  entity.version = shipment.version;
  entity.createdAt = shipment.createdAt;
  entity.updatedAt = shipment.updatedAt;
}

export function shipmentLinesToOrm(shipment: Shipment): ShipmentLineOrmEntity[] {
  return shipment.lines.map((line) => {
    const entity = new ShipmentLineOrmEntity();
    entity.id = UniqueID.create().value;
    entity.shipmentId = shipment.id.value;
    entity.orderLineId = line.orderLineId;
    entity.quantity = line.quantity;
    return entity;
  });
}
