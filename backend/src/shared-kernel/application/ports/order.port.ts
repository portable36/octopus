export const ORDER_PORT = Symbol('ORDER_PORT');

export interface CheckoutOrderLineInput {
  readonly lineId: string;
  readonly vendorId: string;
  readonly storeId: string;
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
}

export type OrderPaymentMethodDto = 'COD' | 'SSLCOMMERZ' | 'BKASH' | 'NAGAD';

export interface CheckoutOrderCreateInput {
  readonly checkoutId: string;
  readonly idempotencyKey: string;
  readonly customerId: string | null;
  readonly vendorId: string;
  readonly storeId: string;
  readonly paymentMethod: OrderPaymentMethodDto;
  readonly currencyCode: string;
  readonly subtotalMinor: number;
  readonly discountMinor: number;
  readonly shippingMinor: number;
  readonly taxMinor: number;
  readonly commissionMinor: number;
  readonly totalMinor: number;
  readonly shippingMethod: string;
  readonly shippingAddress: {
    readonly line1: string;
    readonly line2?: string;
    readonly city: string;
    readonly region?: string;
    readonly postalCode?: string;
    readonly countryCode: string;
  };
  readonly lines: readonly CheckoutOrderLineInput[];
  readonly appliedPromotionId: string | null;
  readonly appliedCouponCode: string | null;
  readonly pricingSnapshot: {
    readonly taxRateBps: number;
    readonly commissionRateBps: number;
    readonly evaluatedAt: string;
  };
}

export interface CheckoutOrderCreateResult {
  readonly orderId: string;
  readonly orderNumber: string;
  readonly vendorId: string;
  readonly storeId: string;
  readonly totalMinor: number;
  readonly currencyCode: string;
  readonly status: 'PENDING_PAYMENT';
}

export interface MarkOrderPaidFromPaymentInput {
  readonly orderId: string;
  readonly paymentIntentId: string;
  readonly amountMinor: number;
  readonly currencyCode: string;
}

export interface OrderFulfillmentLineSnapshot {
  readonly lineId: string;
  readonly quantity: number;
  readonly fulfilledQuantity: number;
  readonly productId: string;
  readonly variantId: string;
}

export interface OrderFulfillmentSnapshot {
  readonly orderId: string;
  readonly orderNumber: string;
  readonly vendorId: string;
  readonly storeId: string;
  readonly status: string;
  readonly paymentStatus: string;
  readonly paymentMethod: OrderPaymentMethodDto;
  readonly currencyCode: string;
  readonly totalMinor: number;
  readonly shippingAddress: {
    readonly line1: string;
    readonly line2?: string;
    readonly city: string;
    readonly region?: string;
    readonly postalCode?: string;
    readonly countryCode: string;
  };
  readonly lines: readonly OrderFulfillmentLineSnapshot[];
}

export interface OrderReturnLineSnapshot {
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
  readonly warehouseId: string;
}

export interface OrderReturnSnapshot {
  readonly orderId: string;
  readonly orderNumber: string;
  readonly customerId: string | null;
  readonly vendorId: string;
  readonly storeId: string;
  readonly status: string;
  readonly paymentStatus: string;
  readonly paymentMethod: OrderPaymentMethodDto;
  readonly currencyCode: string;
  readonly totalMinor: number;
  /** ponytail: proxy until Order persists deliveredAt from Fulfillment. */
  readonly returnWindowAnchorAt: Date;
  readonly lines: readonly OrderReturnLineSnapshot[];
}

export interface OrderFinanceSnapshot {
  readonly orderId: string;
  readonly vendorId: string;
  readonly storeId: string;
  readonly paymentStatus: string;
  readonly paymentMethod: OrderPaymentMethodDto;
  readonly currencyCode: string;
  readonly subtotalMinor: number;
  readonly discountMinor: number;
  readonly commissionMinor: number;
  readonly totalMinor: number;
  readonly commissionRateBps: number;
}

export interface PrepareOrderShipmentInput {
  readonly orderId: string;
  readonly actorUserId: string;
  readonly actorRoles: readonly string[];
  readonly lines: readonly { readonly lineId: string; readonly quantity: number }[];
}

export interface OrderPort {
  createFromCheckout(input: CheckoutOrderCreateInput): Promise<CheckoutOrderCreateResult>;
  /** Trusted Payment-module seam — never expose to storefront. */
  markPaidFromPayment(input: MarkOrderPaidFromPaymentInput): Promise<void>;
  getFulfillmentSnapshot(orderId: string): Promise<OrderFulfillmentSnapshot | null>;
  getReturnSnapshot(orderId: string): Promise<OrderReturnSnapshot | null>;
  getFinanceSnapshot(orderId: string): Promise<OrderFinanceSnapshot | null>;
  prepareShipment(input: PrepareOrderShipmentInput): Promise<OrderFulfillmentSnapshot>;
  fulfillShipmentLines(input: PrepareOrderShipmentInput): Promise<void>;
}
