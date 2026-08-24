export type CheckoutStatus = 'COMPLETED' | 'FAILED';

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
}

export interface CheckoutPaymentRef {
  readonly paymentIntentId: string;
  readonly amountMinor: number;
  readonly currencyCode: string;
  readonly clientSecret: string;
  readonly status: string;
}

export interface CheckoutOutcome {
  readonly checkoutId: string;
  readonly cartId: string;
  readonly cartVersion: number;
  readonly status: 'COMPLETED';
  readonly totals: CheckoutTotals;
  readonly orders: readonly CheckoutOrderRef[];
  readonly payment: CheckoutPaymentRef;
  readonly reservationIds: readonly string[];
}
