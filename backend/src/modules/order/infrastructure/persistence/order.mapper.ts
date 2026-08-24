import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { Order } from '../../domain/aggregates/order.aggregate';
import type { OrderShippingAddressSnapshot } from '../../domain/order.types';
import { OrderLineOrmEntity, OrderOrmEntity } from './order.orm-entity';

export function orderToDomain(entity: OrderOrmEntity, lines: OrderLineOrmEntity[]): Order {
  return Order.reconstitute(UniqueID.from(entity.id), {
    orderNumber: entity.orderNumber,
    checkoutId: entity.checkoutId,
    idempotencyKey: entity.idempotencyKey,
    customerId: entity.customerId,
    vendorId: entity.vendorId,
    storeId: entity.storeId,
    currencyCode: entity.currencyCode,
    subtotalMinor: entity.subtotalMinor,
    discountMinor: entity.discountMinor,
    shippingMinor: entity.shippingMinor,
    taxMinor: entity.taxMinor,
    commissionMinor: entity.commissionMinor,
    totalMinor: entity.totalMinor,
    shippingMethod: entity.shippingMethod,
    shippingAddress: entity.shippingAddressJson as unknown as OrderShippingAddressSnapshot,
    appliedPromotionId: entity.appliedPromotionId,
    appliedCouponCode: entity.appliedCouponCode,
    pricingSnapshot: entity.pricingSnapshotJson as {
      taxRateBps: number;
      commissionRateBps: number;
      evaluatedAt: string;
    },
    status: entity.status,
    paymentStatus: entity.paymentStatus,
    fulfillmentStatus: entity.fulfillmentStatus,
    lines: Object.freeze(
      lines.map((line) => ({
        lineId: line.lineId,
        productId: line.productId,
        variantId: line.variantId,
        offerId: line.offerId,
        quantity: line.quantity,
        fulfilledQuantity: line.fulfilledQuantity,
        unitPriceMinor: line.unitPriceMinor,
        lineSubtotalMinor: line.lineSubtotalMinor,
        lineDiscountMinor: line.lineDiscountMinor,
        lineTaxMinor: line.lineTaxMinor,
        lineTotalMinor: line.lineTotalMinor,
        currencyCode: line.currencyCode,
        reservationId: line.reservationId,
        warehouseId: line.warehouseId,
      })),
    ),
    version: entity.version,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  });
}

export function applyOrderToOrm(order: Order, entity: OrderOrmEntity): void {
  entity.id = order.id.value;
  entity.orderNumber = order.orderNumber;
  entity.checkoutId = order.checkoutId;
  entity.idempotencyKey = order.idempotencyKey;
  entity.customerId = order.customerId;
  entity.vendorId = order.vendorId;
  entity.storeId = order.storeId;
  entity.currencyCode = order.currencyCode;
  entity.subtotalMinor = order.subtotalMinor;
  entity.discountMinor = order.discountMinor;
  entity.shippingMinor = order.shippingMinor;
  entity.taxMinor = order.taxMinor;
  entity.commissionMinor = order.commissionMinor;
  entity.totalMinor = order.totalMinor;
  entity.shippingMethod = order.shippingMethod;
  entity.shippingAddressJson = { ...order.shippingAddress };
  entity.appliedPromotionId = order.appliedPromotionId;
  entity.appliedCouponCode = order.appliedCouponCode;
  entity.pricingSnapshotJson = { ...order.pricingSnapshot };
  entity.status = order.status;
  entity.paymentStatus = order.paymentStatus;
  entity.fulfillmentStatus = order.fulfillmentStatus;
  entity.version = order.version;
  entity.createdAt = order.createdAt;
  entity.updatedAt = order.updatedAt;
}

export function orderLinesToOrm(order: Order): OrderLineOrmEntity[] {
  return order.lines.map((line) => {
    const entity = new OrderLineOrmEntity();
    entity.id = UniqueID.create().value;
    entity.orderId = order.id.value;
    entity.lineId = line.lineId;
    entity.productId = line.productId;
    entity.variantId = line.variantId;
    entity.offerId = line.offerId;
    entity.quantity = line.quantity;
    entity.fulfilledQuantity = line.fulfilledQuantity;
    entity.unitPriceMinor = line.unitPriceMinor;
    entity.lineSubtotalMinor = line.lineSubtotalMinor;
    entity.lineDiscountMinor = line.lineDiscountMinor;
    entity.lineTaxMinor = line.lineTaxMinor;
    entity.lineTotalMinor = line.lineTotalMinor;
    entity.currencyCode = line.currencyCode;
    entity.reservationId = line.reservationId;
    entity.warehouseId = line.warehouseId;
    return entity;
  });
}
