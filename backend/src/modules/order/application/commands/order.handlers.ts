import { Inject, Injectable, Optional } from '@nestjs/common';
import { AUDIT_PORT, type AuditPort } from '../../../../shared-kernel/application/ports/audit.port';
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

@Injectable()
export class OrderLifecycleHandler {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    private readonly authz: OrderAuthorizationService,
    @Optional() @Inject(AUDIT_PORT) private readonly audit: AuditPort | null = null,
  ) {}

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
