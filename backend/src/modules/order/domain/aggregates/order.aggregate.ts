import { AggregateRoot } from '../../../../shared-kernel/domain/aggregate-root';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import {
  InvalidOrderFulfillmentError,
  InvalidOrderSnapshotError,
  InvalidOrderTransitionError,
} from '../errors/order.errors';
import type {
  OrderFulfillmentStatus,
  OrderLineSnapshot,
  OrderPaymentMethod,
  OrderPaymentStatus,
  OrderShippingAddressSnapshot,
  OrderStatus,
  OrderAttributionSnapshot,
} from '../order.types';

interface OrderLineProps {
  readonly lineId: string;
  readonly productId: string;
  readonly variantId: string;
  readonly offerId: string;
  readonly quantity: number;
  readonly fulfilledQuantity: number;
  readonly unitPriceMinor: number;
  readonly lineSubtotalMinor: number;
  readonly lineDiscountMinor: number;
  readonly lineTaxMinor: number;
  readonly lineTotalMinor: number;
  readonly currencyCode: string;
  readonly reservationId: string;
  readonly warehouseId: string;
}

interface OrderProps {
  readonly orderNumber: string;
  readonly checkoutId: string;
  readonly idempotencyKey: string;
  readonly customerId: string | null;
  readonly vendorId: string;
  readonly storeId: string;
  readonly currencyCode: string;
  readonly subtotalMinor: number;
  readonly discountMinor: number;
  readonly shippingMinor: number;
  readonly taxMinor: number;
  readonly commissionMinor: number;
  readonly totalMinor: number;
  readonly shippingMethod: string;
  readonly shippingAddress: OrderShippingAddressSnapshot;
  readonly appliedPromotionId: string | null;
  readonly appliedCouponCode: string | null;
  readonly paymentMethod: OrderPaymentMethod;
  readonly pricingSnapshot: {
    readonly taxRateBps: number;
    readonly commissionRateBps: number;
    readonly evaluatedAt: string;
  };
  readonly attribution: OrderAttributionSnapshot | null;
  readonly status: OrderStatus;
  readonly paymentStatus: OrderPaymentStatus;
  readonly fulfillmentStatus: OrderFulfillmentStatus;
  readonly lines: readonly OrderLineProps[];
  readonly version: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

function assertMoney(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new InvalidOrderSnapshotError(`${label} must be a non-negative integer.`);
  }
}

export class Order extends AggregateRoot<UniqueID> {
  private constructor(
    id: UniqueID,
    private props: OrderProps,
  ) {
    super(id);
  }

  public static createFromCheckout(input: {
    readonly checkoutId: string;
    readonly idempotencyKey: string;
    readonly customerId: string | null;
    readonly vendorId: string;
    readonly storeId: string;
    readonly currencyCode: string;
    readonly subtotalMinor: number;
    readonly discountMinor: number;
    readonly shippingMinor: number;
    readonly taxMinor: number;
    readonly commissionMinor: number;
    readonly totalMinor: number;
    readonly shippingMethod: string;
    readonly shippingAddress: OrderShippingAddressSnapshot;
    readonly appliedPromotionId: string | null;
    readonly appliedCouponCode: string | null;
    readonly paymentMethod: OrderPaymentMethod;
    readonly pricingSnapshot: {
      readonly taxRateBps: number;
      readonly commissionRateBps: number;
      readonly evaluatedAt: string;
    };
    readonly attribution?: OrderAttributionSnapshot | null;
    readonly lines: readonly {
      readonly lineId: string;
      readonly productId: string;
      readonly variantId: string;
      readonly offerId: string;
      readonly quantity: number;
      readonly unitPriceMinor: number;
      readonly lineSubtotalMinor: number;
      readonly lineDiscountMinor: number;
      readonly lineTaxMinor: number;
      readonly lineTotalMinor: number;
      readonly currencyCode: string;
      readonly reservationId: string;
      readonly warehouseId: string;
    }[];
  }): Order {
    const currency = input.currencyCode.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new InvalidOrderSnapshotError('Currency must be a 3-letter ISO code.');
    }
    if (input.lines.length === 0) {
      throw new InvalidOrderSnapshotError('Order requires at least one line.');
    }
    for (const label of [
      'subtotalMinor',
      'discountMinor',
      'shippingMinor',
      'taxMinor',
      'commissionMinor',
      'totalMinor',
    ] as const) {
      assertMoney(input[label], label);
    }

    const lines = input.lines.map((line) => {
      if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
        throw new InvalidOrderSnapshotError('Line quantity must be a positive integer.');
      }
      assertMoney(line.unitPriceMinor, 'unitPriceMinor');
      assertMoney(line.lineSubtotalMinor, 'lineSubtotalMinor');
      assertMoney(line.lineDiscountMinor, 'lineDiscountMinor');
      assertMoney(line.lineTaxMinor, 'lineTaxMinor');
      assertMoney(line.lineTotalMinor, 'lineTotalMinor');
      return {
        ...line,
        currencyCode: line.currencyCode.trim().toUpperCase(),
        fulfilledQuantity: 0,
      };
    });

    const id = UniqueID.create();
    const now = new Date();
    const order = new Order(id, {
      orderNumber: `ORD-${id.value.replace(/-/g, '').slice(0, 10).toUpperCase()}`,
      checkoutId: input.checkoutId,
      idempotencyKey: input.idempotencyKey,
      customerId: input.customerId,
      vendorId: input.vendorId,
      storeId: input.storeId,
      currencyCode: currency,
      subtotalMinor: input.subtotalMinor,
      discountMinor: input.discountMinor,
      shippingMinor: input.shippingMinor,
      taxMinor: input.taxMinor,
      commissionMinor: input.commissionMinor,
      totalMinor: input.totalMinor,
      shippingMethod: input.shippingMethod,
      shippingAddress: { ...input.shippingAddress },
      appliedPromotionId: input.appliedPromotionId,
      appliedCouponCode: input.appliedCouponCode,
      paymentMethod: input.paymentMethod,
      pricingSnapshot: { ...input.pricingSnapshot },
      attribution: input.attribution ?? null,
      status: 'PENDING_PAYMENT',
      paymentStatus: 'PENDING',
      fulfillmentStatus: 'UNFULFILLED',
      lines: Object.freeze(lines),
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    order.addEvent('OrderCreated', {
      orderId: order.id.value,
      orderNumber: order.orderNumber,
      vendorId: order.vendorId,
      storeId: order.storeId,
    });
    return order;
  }

  public static reconstitute(id: UniqueID, props: OrderProps): Order {
    return new Order(id, props);
  }

  get orderNumber(): string {
    return this.props.orderNumber;
  }
  get checkoutId(): string {
    return this.props.checkoutId;
  }
  get idempotencyKey(): string {
    return this.props.idempotencyKey;
  }
  get customerId(): string | null {
    return this.props.customerId;
  }
  get vendorId(): string {
    return this.props.vendorId;
  }
  get storeId(): string {
    return this.props.storeId;
  }
  get currencyCode(): string {
    return this.props.currencyCode;
  }
  get subtotalMinor(): number {
    return this.props.subtotalMinor;
  }
  get discountMinor(): number {
    return this.props.discountMinor;
  }
  get shippingMinor(): number {
    return this.props.shippingMinor;
  }
  get taxMinor(): number {
    return this.props.taxMinor;
  }
  get commissionMinor(): number {
    return this.props.commissionMinor;
  }
  get totalMinor(): number {
    return this.props.totalMinor;
  }
  get shippingMethod(): string {
    return this.props.shippingMethod;
  }
  get shippingAddress(): OrderShippingAddressSnapshot {
    return this.props.shippingAddress;
  }
  get appliedPromotionId(): string | null {
    return this.props.appliedPromotionId;
  }
  get appliedCouponCode(): string | null {
    return this.props.appliedCouponCode;
  }
  get paymentMethod(): OrderPaymentMethod {
    return this.props.paymentMethod;
  }
  get pricingSnapshot(): OrderProps['pricingSnapshot'] {
    return this.props.pricingSnapshot;
  }
  get attribution(): OrderAttributionSnapshot | null {
    return this.props.attribution;
  }
  get status(): OrderStatus {
    return this.props.status;
  }
  get paymentStatus(): OrderPaymentStatus {
    return this.props.paymentStatus;
  }
  get fulfillmentStatus(): OrderFulfillmentStatus {
    return this.props.fulfillmentStatus;
  }
  get lines(): readonly OrderLineProps[] {
    return this.props.lines;
  }
  get version(): number {
    return this.props.version;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public lineSnapshots(): OrderLineSnapshot[] {
    return this.props.lines.map((line) => ({ ...line }));
  }

  public markPaid(): void {
    if (this.props.paymentStatus === 'PAID') {
      return;
    }

    if (this.props.status === 'PENDING_PAYMENT') {
      this.transition('PAID', { paymentStatus: 'PAID' });
      this.addEvent('OrderPaid', { orderId: this.id.value });
      return;
    }

    // COD may already be in fulfillment while cash is outstanding.
    if (
      this.props.paymentMethod === 'COD' &&
      this.props.paymentStatus === 'PENDING' &&
      (this.props.status === 'PROCESSING' ||
        this.props.status === 'PARTIALLY_FULFILLED' ||
        this.props.status === 'FULFILLED' ||
        this.props.status === 'COMPLETED')
    ) {
      this.props = {
        ...this.props,
        paymentStatus: 'PAID',
        version: this.props.version + 1,
        updatedAt: new Date(),
      };
      this.addEvent('OrderPaid', { orderId: this.id.value });
      return;
    }

    throw new InvalidOrderTransitionError(this.props.status, 'PAID');
  }

  public markPaymentFailed(): void {
    this.transition('PAYMENT_FAILED', {
      paymentStatus: 'FAILED',
      fulfillmentStatus: 'NOT_APPLICABLE',
    });
  }

  public startProcessing(): void {
    if (
      this.props.status === 'PENDING_PAYMENT' &&
      this.props.paymentMethod === 'COD' &&
      this.props.paymentStatus === 'PENDING'
    ) {
      this.props = {
        ...this.props,
        status: 'PROCESSING',
        version: this.props.version + 1,
        updatedAt: new Date(),
      };
      return;
    }
    this.transition('PROCESSING');
  }

  public fulfillLine(lineId: string, quantity: number): void {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new InvalidOrderFulfillmentError('Fulfillment quantity must be a positive integer.');
    }
    if (this.props.status !== 'PROCESSING' && this.props.status !== 'PARTIALLY_FULFILLED') {
      throw new InvalidOrderTransitionError(this.props.status, 'PARTIALLY_FULFILLED');
    }

    const index = this.props.lines.findIndex((line) => line.lineId === lineId);
    if (index < 0) {
      throw new InvalidOrderFulfillmentError('Order line was not found.');
    }
    const line = this.props.lines[index]!;
    const nextFulfilled = line.fulfilledQuantity + quantity;
    if (nextFulfilled > line.quantity) {
      throw new InvalidOrderFulfillmentError('Cannot fulfill more than ordered quantity.');
    }

    const nextLines = this.props.lines.map((item, i) =>
      i === index ? { ...item, fulfilledQuantity: nextFulfilled } : item,
    );
    const allFulfilled = nextLines.every((item) => item.fulfilledQuantity === item.quantity);
    const anyFulfilled = nextLines.some((item) => item.fulfilledQuantity > 0);
    const nextStatus: OrderStatus = allFulfilled ? 'FULFILLED' : 'PARTIALLY_FULFILLED';
    const nextFulfillment: OrderFulfillmentStatus = allFulfilled
      ? 'FULFILLED'
      : anyFulfilled
        ? 'PARTIALLY_FULFILLED'
        : 'UNFULFILLED';

    if (nextStatus === 'FULFILLED' && this.props.status === 'PROCESSING') {
      // PROCESSING -> FULFILLED is allowed when last units ship in one step
    } else if (nextStatus === 'FULFILLED') {
      this.assertCanTransition('FULFILLED');
    } else {
      this.assertCanTransition('PARTIALLY_FULFILLED');
    }

    this.props = {
      ...this.props,
      lines: Object.freeze(nextLines),
      status: nextStatus,
      fulfillmentStatus: nextFulfillment,
      version: this.props.version + 1,
      updatedAt: new Date(),
    };
    this.addEvent('OrderFulfillmentUpdated', {
      orderId: this.id.value,
      status: nextStatus,
      lineId,
      quantity,
    });
  }

  public complete(): void {
    this.transition('COMPLETED');
    this.addEvent('OrderCompleted', { orderId: this.id.value });
  }

  public cancel(): void {
    this.transition('CANCELLED', { fulfillmentStatus: 'NOT_APPLICABLE' });
    this.addEvent('OrderCancelled', { orderId: this.id.value });
  }

  public requestRefund(): void {
    this.transition('REFUND_REQUESTED', { paymentStatus: 'REFUND_REQUESTED' });
    this.addEvent('RefundRequested', { orderId: this.id.value });
  }

  public requestReturn(): void {
    this.transition('RETURN_REQUESTED');
    this.addEvent('ReturnRequested', { orderId: this.id.value });
  }

  public markReturned(): void {
    this.transition('RETURNED', {
      fulfillmentStatus: 'NOT_APPLICABLE',
      paymentStatus:
        this.props.paymentStatus === 'REFUND_REQUESTED'
          ? 'REFUND_REQUESTED'
          : this.props.paymentStatus,
    });
  }

  private transition(
    next: OrderStatus,
    patch: Partial<Pick<OrderProps, 'paymentStatus' | 'fulfillmentStatus'>> = {},
  ): void {
    this.assertCanTransition(next);
    this.props = {
      ...this.props,
      status: next,
      ...patch,
      version: this.props.version + 1,
      updatedAt: new Date(),
    };
  }

  private assertCanTransition(next: OrderStatus): void {
    const allowed = ALLOWED_TRANSITIONS[this.props.status];
    if (!allowed.includes(next)) {
      throw new InvalidOrderTransitionError(this.props.status, next);
    }
  }
}

const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING_PAYMENT: ['PAID', 'PAYMENT_FAILED'],
  PAYMENT_FAILED: [],
  PAID: ['PROCESSING', 'CANCELLED', 'REFUND_REQUESTED'],
  PROCESSING: ['PARTIALLY_FULFILLED', 'FULFILLED'],
  PARTIALLY_FULFILLED: ['PARTIALLY_FULFILLED', 'FULFILLED'],
  FULFILLED: ['COMPLETED', 'RETURN_REQUESTED'],
  COMPLETED: [],
  CANCELLED: [],
  REFUND_REQUESTED: [],
  RETURN_REQUESTED: ['RETURNED'],
  RETURNED: [],
};
