export type CheckoutStatus = 'COMPLETED' | 'FAILED';

export type CheckoutPaymentMethod = 'COD' | 'SSLCOMMERZ' | 'BKASH' | 'NAGAD';

export interface ShippingAddress {
  readonly line1: string;
  readonly line2?: string;
  readonly city: string;
  readonly region?: string;
  readonly postalCode?: string;
  readonly countryCode: string;
}

export interface CheckoutTotals {
  readonly subtotalMinor: number;
  readonly discountMinor: number;
  readonly shippingMinor: number;
  readonly taxMinor: number;
  readonly commissionMinor: number;
  readonly grandTotalMinor: number;
  readonly currencyCode: string;
}

export interface CheckoutOrderRef {
  readonly orderId: string;
  readonly orderNumber: string;
  readonly vendorId: string;
  readonly storeId: string;
  readonly totalMinor: number;
  readonly currencyCode: string;
  readonly paymentMethod: CheckoutPaymentMethod;
  readonly paymentStatus: 'PENDING';
}

export interface CheckoutPaymentRef {
  readonly paymentIntentId: string;
  readonly orderId: string;
  readonly paymentMethod: CheckoutPaymentMethod;
  readonly amountMinor: number;
  readonly currencyCode: string;
  readonly status: string;
  /** Gateway methods only — never present for COD. */
  readonly clientSecret?: string;
}

export interface CheckoutOutcome {
  readonly checkoutId: string;
  readonly cartId: string;
  readonly cartVersion: number;
  readonly status: 'COMPLETED';
  readonly paymentMethod: CheckoutPaymentMethod;
  readonly totals: CheckoutTotals;
  readonly orders: readonly CheckoutOrderRef[];
  readonly payments: readonly CheckoutPaymentRef[];
  readonly reservationIds: readonly string[];
}
