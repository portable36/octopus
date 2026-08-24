export type CartStatus = 'ACTIVE' | 'CHECKED_OUT' | 'ABANDONED';

export const CART_MAX_LINE_QUANTITY = 99;

export interface CartLineSnapshot {
  readonly lineId: string;
  readonly vendorId: string;
  readonly storeId: string;
  readonly productId: string;
  readonly variantId: string;
  readonly offerId: string;
  readonly quantity: number;
  readonly unitPriceSnapshotMinor: number;
  readonly currencyCode: string;
}

export type CartValidationIssueCode =
  | 'OFFER_MISSING'
  | 'OFFER_UNAVAILABLE'
  | 'PRICE_CHANGED'
  | 'INSUFFICIENT_STOCK'
  | 'INVENTORY_MISSING'
  | 'CURRENCY_MISMATCH'
  | 'VENDOR_ISOLATION';

export interface CartValidationIssue {
  readonly lineId: string;
  readonly code: CartValidationIssueCode;
  readonly message: string;
  readonly currentPriceMinor?: number;
  readonly availableQuantity?: number;
}
