import { Inject, Injectable, Optional } from '@nestjs/common';
import { AUDIT_PORT, type AuditPort } from '../../../../shared-kernel/application/ports/audit.port';
import {
  SHIPMENT_TRACKING_PORT,
  type ShipmentTrackingInfo,
  type ShipmentTrackingPort,
} from '../../../../shared-kernel/application/ports/shipment-tracking.port';
import type {
  CheckoutOrderCreateInput,
  CheckoutOrderCreateResult,
} from '../../../../shared-kernel/application/ports/order.port';
import { Order } from '../../domain/aggregates/order.aggregate';
import {
  OrderAccessDeniedError,
  OrderNotFoundError,
  OrderPaymentMismatchError,
} from '../errors/order.errors';
import { ORDER_REPOSITORY, type OrderRepository } from '../ports/order-repository.interface';
import { OrderAuthorizationService } from '../services/order-authorization.service';

@Injectable()
export class CreateOrderFromCheckoutHandler {
  constructor(@Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository) {}

  public async execute(input: CheckoutOrderCreateInput): Promise<CheckoutOrderCreateResult> {
    const existing = await this.orders.findByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      return this.toResult(existing);
    }

    const order = Order.createFromCheckout({
      checkoutId: input.checkoutId,
      idempotencyKey: input.idempotencyKey,
      customerId: input.customerId,
      vendorId: input.vendorId,
      storeId: input.storeId,
      paymentMethod: input.paymentMethod,
      currencyCode: input.currencyCode,
      subtotalMinor: input.subtotalMinor,
      discountMinor: input.discountMinor,
      shippingMinor: input.shippingMinor,
      taxMinor: input.taxMinor,
      commissionMinor: input.commissionMinor,
      totalMinor: input.totalMinor,
      shippingMethod: input.shippingMethod,
      shippingAddress: input.shippingAddress,
      appliedPromotionId: input.appliedPromotionId,
      appliedCouponCode: input.appliedCouponCode,
      pricingSnapshot: input.pricingSnapshot,
      attribution: input.attribution ?? null,
      lines: input.lines.map((line) => ({
        lineId: line.lineId,
        productId: line.productId,
        variantId: line.variantId,
        offerId: line.offerId,
        quantity: line.quantity,
        unitPriceMinor: line.unitPriceMinor,
        lineSubtotalMinor: line.lineSubtotalMinor,
        lineDiscountMinor: line.lineDiscountMinor,
        lineTaxMinor: line.lineTaxMinor,
        lineTotalMinor: line.lineTotalMinor,
        currencyCode: line.currencyCode,
        reservationId: line.reservationId,
        warehouseId: line.warehouseId,
      })),
    });
    await this.orders.save(order);
    return this.toResult(order);
  }

  private toResult(order: Order): CheckoutOrderCreateResult {
    return {
      orderId: order.id.value,
      orderNumber: order.orderNumber,
      vendorId: order.vendorId,
      storeId: order.storeId,
      totalMinor: order.totalMinor,
      currencyCode: order.currencyCode,
      status: 'PENDING_PAYMENT',
    };
  }
}

export interface OrderTimelineMilestoneDto {
  readonly code:
    | 'ORDER_PLACED'
    | 'PAYMENT_PENDING'
    | 'PAYMENT_CONFIRMED'
    | 'PAYMENT_FAILED'
    | 'PROCESSING'
    | 'SHIPPED'
    | 'IN_TRANSIT'
    | 'OUT_FOR_DELIVERY'
    | 'DELIVERED'
    | 'RETURNED'
    | 'CANCELLED';
  readonly title: string;
  readonly description: string;
  readonly timestamp: string;
  readonly completed: boolean;
  readonly current: boolean;
}

export interface OrderTrackingTimelineDto {
  readonly orderId: string;
  readonly orderNumber: string;
  readonly status: string;
  readonly paymentStatus: string;
  readonly fulfillmentStatus: string;
  readonly paymentMethod: string;
  readonly currencyCode: string;
  readonly totalMinor: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly shipments: readonly {
    readonly shipmentId: string;
    readonly provider: string;
    readonly status: string;
    readonly providerStatus: string | null;
    readonly trackingCode: string | null;
    readonly providerConsignmentId: string | null;
    readonly recipientName: string;
    readonly recipientPhone: string;
    readonly recipientAddress: string;
    readonly createdAt: string;
    readonly updatedAt: string;
  }[];
  readonly milestones: readonly OrderTimelineMilestoneDto[];
}

function buildOrderMilestones(
  order: Order,
  shipments: readonly ShipmentTrackingInfo[],
): OrderTimelineMilestoneDto[] {
  const milestones: OrderTimelineMilestoneDto[] = [];
  const createdAtIso = order.createdAt.toISOString();
  const updatedAtIso = order.updatedAt.toISOString();

  // 1. Order Placed
  milestones.push({
    code: 'ORDER_PLACED',
    title: 'Order Placed',
    description: `Order ${order.orderNumber} was placed successfully.`,
    timestamp: createdAtIso,
    completed: true,
    current: order.status === 'PENDING_PAYMENT' && order.paymentMethod !== 'COD',
  });

  // 2. Payment
  if (order.paymentStatus === 'PAID') {
    milestones.push({
      code: 'PAYMENT_CONFIRMED',
      title: 'Payment Confirmed',
      description: `Payment confirmed via ${order.paymentMethod}.`,
      timestamp: updatedAtIso,
      completed: true,
      current: false,
    });
  } else if (order.paymentStatus === 'FAILED') {
    milestones.push({
      code: 'PAYMENT_FAILED',
      title: 'Payment Failed',
      description: `Payment attempt via ${order.paymentMethod} was unsuccessful.`,
      timestamp: updatedAtIso,
      completed: true,
      current: true,
    });
  } else if (order.paymentMethod === 'COD') {
    milestones.push({
      code: 'PAYMENT_PENDING',
      title: 'Cash on Delivery',
      description: 'Payment will be collected upon parcel delivery.',
      timestamp: createdAtIso,
      completed: false,
      current: false,
    });
  } else {
    milestones.push({
      code: 'PAYMENT_PENDING',
      title: 'Payment Pending',
      description: `Awaiting payment confirmation via ${order.paymentMethod}.`,
      timestamp: createdAtIso,
      completed: false,
      current: true,
    });
  }

  // Cancelled termination
  if (order.status === 'CANCELLED') {
    milestones.push({
      code: 'CANCELLED',
      title: 'Order Cancelled',
      description: 'The order has been cancelled.',
      timestamp: updatedAtIso,
      completed: true,
      current: true,
    });
    return milestones;
  }

  // 3. Processing
  const isProcessingOrLater =
    ['PROCESSING', 'PARTIALLY_FULFILLED', 'FULFILLED', 'COMPLETED'].includes(order.status) ||
    shipments.length > 0;

  milestones.push({
    code: 'PROCESSING',
    title: 'Processing Order',
    description: 'Seller is packing and preparing items for handover to courier.',
    timestamp: updatedAtIso,
    completed: isProcessingOrLater,
    current: order.status === 'PROCESSING' && shipments.length === 0,
  });

  // Derived shipment milestones
  const latestShipment = shipments[shipments.length - 1];
  const hasShipped = shipments.some((s) =>
    ['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(s.status),
  );
  const hasInTransit = shipments.some((s) =>
    ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(s.status),
  );
  const hasOutForDelivery = shipments.some((s) =>
    ['OUT_FOR_DELIVERY', 'DELIVERED'].includes(s.status),
  );
  const hasDelivered =
    order.fulfillmentStatus === 'FULFILLED' ||
    order.status === 'COMPLETED' ||
    shipments.some((s) => s.status === 'DELIVERED');
  const hasReturned = order.status === 'RETURNED' || shipments.some((s) => s.status === 'RETURNED');

  const courierName = latestShipment ? latestShipment.provider : 'Courier';
  const trackingNumber = latestShipment?.trackingCode ?? latestShipment?.providerConsignmentId;

  // 4. Shipped
  milestones.push({
    code: 'SHIPPED',
    title: 'Shipped',
    description: latestShipment
      ? `Parcel handed over to ${courierName}${trackingNumber ? ` (Tracking: ${trackingNumber})` : ''}.`
      : 'Parcel handed over to courier delivery partner.',
    timestamp: latestShipment?.createdAt.toISOString() ?? updatedAtIso,
    completed: hasShipped,
    current: hasShipped && !hasInTransit && !hasOutForDelivery && !hasDelivered,
  });

  // 5. In Transit
  milestones.push({
    code: 'IN_TRANSIT',
    title: 'In Transit',
    description: 'Parcel is moving through the courier logistics network.',
    timestamp: latestShipment?.updatedAt.toISOString() ?? updatedAtIso,
    completed: hasInTransit,
    current: hasInTransit && !hasOutForDelivery && !hasDelivered,
  });

  // 6. Out For Delivery
  milestones.push({
    code: 'OUT_FOR_DELIVERY',
    title: 'Out for Delivery',
    description: 'Delivery rider is on the way to the delivery address.',
    timestamp: latestShipment?.updatedAt.toISOString() ?? updatedAtIso,
    completed: hasOutForDelivery,
    current: hasOutForDelivery && !hasDelivered,
  });

  // 7. Delivered / Returned
  if (hasReturned) {
    milestones.push({
      code: 'RETURNED',
      title: 'Returned',
      description: 'Shipment has been returned to merchant.',
      timestamp: updatedAtIso,
      completed: true,
      current: true,
    });
  } else {
    milestones.push({
      code: 'DELIVERED',
      title: 'Delivered',
      description: 'Package has been delivered to customer.',
      timestamp: latestShipment?.updatedAt.toISOString() ?? updatedAtIso,
      completed: hasDelivered,
      current: hasDelivered,
    });
  }

  return milestones;
}

@Injectable()
export class OrderLifecycleHandler {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(OrderAuthorizationService) private readonly authz: OrderAuthorizationService,
    @Optional() @Inject(AUDIT_PORT) private readonly audit: AuditPort | null = null,
    @Optional()
    @Inject(SHIPMENT_TRACKING_PORT)
    private readonly shipmentTracking: ShipmentTrackingPort | null = null,
  ) {}

  public async getTrackingTimeline(input: {
    readonly orderId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
  }): Promise<OrderTrackingTimelineDto> {
    const order = await this.authz.getOwnedOrThrow(
      this.orders,
      input.orderId,
      input.actorUserId,
      input.actorRoles,
    );

    const rawShipments = this.shipmentTracking
      ? await this.shipmentTracking.getShipmentsForOrder(order.id.value)
      : [];

    const shipments = rawShipments.map((s) => ({
      shipmentId: s.shipmentId,
      provider: s.provider,
      status: s.status,
      providerStatus: s.providerStatus,
      trackingCode: s.trackingCode,
      providerConsignmentId: s.providerConsignmentId,
      recipientName: s.recipientName,
      recipientPhone: s.recipientPhone,
      recipientAddress: s.recipientAddress,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    const milestones = buildOrderMilestones(order, rawShipments);

    return {
      orderId: order.id.value,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      paymentMethod: order.paymentMethod,
      currencyCode: order.currencyCode,
      totalMinor: order.totalMinor,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      shipments,
      milestones,
    };
  }

  public async get(input: {
    readonly orderId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
  }): Promise<Order> {
    return this.authz.getOwnedOrThrow(
      this.orders,
      input.orderId,
      input.actorUserId,
      input.actorRoles,
    );
  }

  public async listMine(input: {
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
  }): Promise<Order[]> {
    if (input.actorRoles.includes('PLATFORM_ADMIN')) {
      return this.orders.listByCustomerId(input.actorUserId);
    }
    return this.orders.listByCustomerId(input.actorUserId);
  }

  public async listByStore(input: {
    readonly storeId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
  }): Promise<Order[]> {
    const list = await this.orders.listByStoreId(input.storeId);
    const readable: Order[] = [];
    for (const order of list) {
      try {
        await this.authz.requireReadable(order, input.actorUserId, input.actorRoles);
        readable.push(order);
      } catch {
        // skip unauthorized
      }
    }
    return readable;
  }

  public async listRecentForPlatform(input: {
    readonly actorRoles: readonly string[];
    readonly limit?: number;
  }): Promise<Order[]> {
    if (!input.actorRoles.includes('PLATFORM_ADMIN')) {
      throw new OrderAccessDeniedError();
    }
    return this.orders.listRecent(input.limit ?? 50);
  }

  public async markPaid(input: {
    readonly orderId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
  }): Promise<Order> {
    const order = await this.requireForMutation(input);
    order.markPaid();
    await this.orders.save(order);
    return order;
  }

  public async markPaymentFailed(input: {
    readonly orderId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
  }): Promise<Order> {
    const order = await this.requireForMutation(input);
    order.markPaymentFailed();
    await this.orders.save(order);
    return order;
  }

  public async startProcessing(input: {
    readonly orderId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
  }): Promise<Order> {
    const order = await this.requireFulfillment(input);
    order.startProcessing();
    await this.orders.save(order);
    return order;
  }

  public async fulfillLine(input: {
    readonly orderId: string;
    readonly lineId: string;
    readonly quantity: number;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
  }): Promise<Order> {
    const order = await this.requireFulfillment(input);
    order.fulfillLine(input.lineId, input.quantity);
    await this.orders.save(order);
    return order;
  }

  public async complete(input: {
    readonly orderId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
  }): Promise<Order> {
    const order = await this.requireFulfillment(input);
    order.complete();
    await this.orders.save(order);
    return order;
  }

  public async cancel(input: {
    readonly orderId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
  }): Promise<Order> {
    const order = await this.requireForMutation(input);
    // Customer may cancel only when PAID before processing? Domain allows PAID -> CANCELLED.
    // Also allow customer if they own it.
    if (!input.actorRoles.includes('PLATFORM_ADMIN') && order.customerId === input.actorUserId) {
      order.cancel();
      await this.orders.save(order);
      await this.auditOrderCancelled(order, input.actorUserId);
      return order;
    }
    await this.authz.requireFulfiller(order, input.actorUserId, input.actorRoles);
    order.cancel();
    await this.orders.save(order);
    await this.auditOrderCancelled(order, input.actorUserId);
    return order;
  }

  private async auditOrderCancelled(order: Order, actorUserId: string): Promise<void> {
    await this.audit?.append({
      actorUserId,
      action: 'order.cancelled',
      resourceType: 'order',
      resourceId: order.id.value,
      vendorId: order.vendorId,
      storeId: order.storeId,
      after: { status: order.status },
    });
  }

  public async requestRefund(input: {
    readonly orderId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
  }): Promise<Order> {
    const order = await this.authz.getOwnedOrThrow(
      this.orders,
      input.orderId,
      input.actorUserId,
      input.actorRoles,
    );
    order.requestRefund();
    await this.orders.save(order);
    return order;
  }

  public async requestReturn(input: {
    readonly orderId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
  }): Promise<Order> {
    const order = await this.authz.getOwnedOrThrow(
      this.orders,
      input.orderId,
      input.actorUserId,
      input.actorRoles,
    );
    order.requestReturn();
    await this.orders.save(order);
    return order;
  }

  public async markReturned(input: {
    readonly orderId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
  }): Promise<Order> {
    const order = await this.requireFulfillment(input);
    order.markReturned();
    await this.orders.save(order);
    return order;
  }

  /** Trusted Payment-module entry — no staff RBAC; amount verified by caller. */
  public async markPaidFromPayment(input: {
    readonly orderId: string;
    readonly amountMinor: number;
    readonly currencyCode: string;
  }): Promise<Order> {
    const order = await this.orders.findById(input.orderId);
    if (!order) {
      throw new OrderNotFoundError();
    }
    if (
      order.totalMinor !== input.amountMinor ||
      order.currencyCode !== input.currencyCode.trim().toUpperCase()
    ) {
      throw new OrderPaymentMismatchError();
    }
    order.markPaid();
    await this.orders.save(order);
    return order;
  }

  public async getFulfillmentSnapshot(orderId: string): Promise<Order | null> {
    return this.orders.findById(orderId);
  }

  public async getFulfillmentSnapshotByOrderNumber(orderNumber: string): Promise<Order | null> {
    return this.orders.findByOrderNumber(orderNumber);
  }

  public async prepareShipment(input: {
    readonly orderId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
    readonly lines: readonly { readonly lineId: string; readonly quantity: number }[];
  }): Promise<Order> {
    const order = await this.requireFulfillment(input);
    if (order.paymentMethod !== 'COD' && order.paymentStatus !== 'PAID') {
      throw new OrderNotFoundError('Order must be paid before shipment (non-COD).');
    }
    for (const line of input.lines) {
      const existing = order.lines.find((l) => l.lineId === line.lineId);
      if (!existing) {
        throw new OrderNotFoundError(`Order line ${line.lineId} was not found.`);
      }
      if (existing.fulfilledQuantity + line.quantity > existing.quantity) {
        throw new OrderNotFoundError(`Cannot fulfill more than ordered for line ${line.lineId}.`);
      }
    }
    if (order.status === 'PENDING_PAYMENT' && order.paymentMethod === 'COD') {
      order.startProcessing();
      await this.orders.save(order);
    } else if (order.status === 'PAID') {
      order.startProcessing();
      await this.orders.save(order);
    }
    return (await this.orders.findById(order.id.value))!;
  }

  public async fulfillShipmentLines(input: {
    readonly orderId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
    readonly lines: readonly { readonly lineId: string; readonly quantity: number }[];
  }): Promise<Order> {
    const order = await this.requireFulfillment(input);
    for (const line of input.lines) {
      order.fulfillLine(line.lineId, line.quantity);
    }
    await this.orders.save(order);
    return order;
  }

  private async requireForMutation(input: {
    readonly orderId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
  }): Promise<Order> {
    const order = await this.orders.findById(input.orderId);
    if (!order) {
      throw new OrderNotFoundError();
    }
    if (input.actorRoles.includes('PLATFORM_ADMIN')) {
      return order;
    }
    await this.authz.requireFulfiller(order, input.actorUserId, input.actorRoles);
    return order;
  }

  private async requireFulfillment(input: {
    readonly orderId: string;
    readonly actorUserId: string;
    readonly actorRoles: readonly string[];
  }): Promise<Order> {
    return this.requireForMutation(input);
  }
}
