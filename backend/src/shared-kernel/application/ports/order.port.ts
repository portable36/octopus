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

export interface CheckoutOrderCreateInput {
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

export interface OrderPort {
  createFromCheckout(input: CheckoutOrderCreateInput): Promise<CheckoutOrderCreateResult>;
}
