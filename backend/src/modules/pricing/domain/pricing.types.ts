export type PromotionStatus = 'DRAFT' | 'ACTIVE' | 'DISABLED';

export type DiscountType = 'PERCENTAGE' | 'FIXED';

export type PromotionScope = 'ALL' | 'PRODUCT' | 'CATEGORY' | 'VENDOR' | 'STORE';

export interface QuoteLineInput {
  readonly lineId: string;
  readonly variantId: string;
  readonly productId: string;
  readonly categoryIds: readonly string[];
  readonly quantity: number;
  /** Catalog / store-offer list price per unit (integer minor units). */
  readonly unitBasePriceMinor: number;
  /** Optional explicit sale unit price; when set and lower than base, used as starting unit price. */
  readonly unitSalePriceMinor?: number;
}

export interface QuoteLineResult {
  readonly lineId: string;
  readonly variantId: string;
  readonly quantity: number;
  readonly unitBasePriceMinor: number;
  readonly unitSalePriceMinor: number;
  readonly lineSubtotalMinor: number;
  readonly lineDiscountMinor: number;
  readonly lineTaxableMinor: number;
  readonly lineTaxMinor: number;
  readonly lineTotalMinor: number;
}

export interface PriceQuote {
  readonly currencyCode: string;
  readonly vendorId: string;
  readonly storeId: string;
  readonly lines: readonly QuoteLineResult[];
  readonly subtotalMinor: number;
  readonly discountMinor: number;
  readonly shippingMinor: number;
  readonly taxMinor: number;
  readonly commissionMinor: number;
  readonly totalMinor: number;
  readonly appliedPromotionId: string | null;
  readonly appliedCouponCode: string | null;
  /** Inputs needed to reproduce the quote later on an order snapshot. */
  readonly snapshot: {
    readonly taxRateBps: number;
    readonly commissionRateBps: number;
    readonly evaluatedAt: string;
  };
}
