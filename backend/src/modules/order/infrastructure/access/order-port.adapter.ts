import { Inject, Injectable } from '@nestjs/common';
import type {
  CheckoutOrderCreateInput,
  CheckoutOrderCreateResult,
  MarkOrderPaidFromPaymentInput,
  OrderFulfillmentSnapshot,
  OrderPort,
  PrepareOrderShipmentInput,
} from '../../../../shared-kernel/application/ports/order.port';
import {
  CreateOrderFromCheckoutHandler,
  OrderLifecycleHandler,
} from '../../application/commands/order.handlers';
import type { Order } from '../../domain/aggregates/order.aggregate';

@Injectable()
export class OrderPortAdapter implements OrderPort {
  constructor(
    @Inject(CreateOrderFromCheckoutHandler)
    private readonly createHandler: CreateOrderFromCheckoutHandler,
    @Inject(OrderLifecycleHandler)
    private readonly lifecycle: OrderLifecycleHandler,
  ) {}

  public async createFromCheckout(
    input: CheckoutOrderCreateInput,
  ): Promise<CheckoutOrderCreateResult> {
    return this.createHandler.execute(input);
  }

  public async markPaidFromPayment(input: MarkOrderPaidFromPaymentInput): Promise<void> {
    await this.lifecycle.markPaidFromPayment({
      orderId: input.orderId,
      amountMinor: input.amountMinor,
      currencyCode: input.currencyCode,
    });
  }

  public async getFulfillmentSnapshot(orderId: string): Promise<OrderFulfillmentSnapshot | null> {
    const order = await this.lifecycle.getFulfillmentSnapshot(orderId);
    return order ? toSnapshot(order) : null;
  }

  public async prepareShipment(
    input: PrepareOrderShipmentInput,
  ): Promise<OrderFulfillmentSnapshot> {
    const order = await this.lifecycle.prepareShipment(input);
    return toSnapshot(order);
  }

  public async fulfillShipmentLines(input: PrepareOrderShipmentInput): Promise<void> {
    await this.lifecycle.fulfillShipmentLines(input);
  }
}

function toSnapshot(order: Order): OrderFulfillmentSnapshot {
  return {
    orderId: order.id.value,
    orderNumber: order.orderNumber,
    vendorId: order.vendorId,
    storeId: order.storeId,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    currencyCode: order.currencyCode,
    totalMinor: order.totalMinor,
    shippingAddress: { ...order.shippingAddress },
    lines: order.lines.map((line) => ({
      lineId: line.lineId,
      quantity: line.quantity,
      fulfilledQuantity: line.fulfilledQuantity,
      productId: line.productId,
      variantId: line.variantId,
    })),
  };
}
