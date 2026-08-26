export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAYMENT_FAILED'
  | 'PAID'
  | 'PROCESSING'
  | 'PARTIALLY_FULFILLED'
  | 'FULFILLED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUND_REQUESTED'
  | 'RETURN_REQUESTED'
  | 'RETURNED';

export type OrderPaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUND_REQUESTED' | 'REFUNDED';

export type OrderFulfillmentStatus =
  'UNFULFILLED' | 'PARTIALLY_FULFILLED' | 'FULFILLED' | 'NOT_APPLICABLE';

export type OrderPaymentMethod = 'COD' | 'SSLCOMMERZ' | 'BKASH' | 'NAGAD';

export interface OrderShippingAddressSnapshot {
  readonly line1: string;
  readonly line2?: string;
  readonly city: string;
  readonly region?: string;
  readonly postalCode?: string;
  readonly countryCode: string;
}

/** Checkout attribution snapshot (immutable after create). */
export interface OrderAttributionSnapshot {
  readonly landingPath?: string;
  readonly referrer?: string;
  readonly utmSource?: string;
  readonly utmMedium?: string;
  readonly utmCampaign?: string;
  readonly utmTerm?: string;
  readonly utmContent?: string;
  readonly gclid?: string;
  readonly fbclid?: string;
  readonly firstTouchAt?: string;
  readonly lastTouchAt?: string;
}

export interface OrderLineSnapshot {
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
