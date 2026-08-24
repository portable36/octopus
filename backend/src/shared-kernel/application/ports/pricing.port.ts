export const PRICING_PORT = Symbol('PRICING_PORT');

export interface PricingQuoteLineInput {
  readonly lineId: string;
  readonly variantId: string;
  readonly productId: string;
  readonly categoryIds: readonly string[];
  readonly quantity: number;
  readonly unitBasePriceMinor: number;
  readonly unitSalePriceMinor?: number;
}

export interface PricingQuoteRequest {
  readonly vendorId: string;
  readonly storeId: string;
  readonly currencyCode: string;
  readonly lines: readonly PricingQuoteLineInput[];
  readonly shippingMinor?: number;
  readonly taxRateBps?: number;
  readonly commissionRateBps?: number;
  readonly couponCode?: string;
  readonly customerId?: string;
  readonly at?: Date;
}

export interface PricingQuoteLineResult {
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

export interface PricingQuoteResult {
  readonly currencyCode: string;
  readonly vendorId: string;
  readonly storeId: string;
  readonly lines: readonly PricingQuoteLineResult[];
  readonly subtotalMinor: number;
  readonly discountMinor: number;
  readonly shippingMinor: number;
  readonly taxMinor: number;
  readonly commissionMinor: number;
  readonly totalMinor: number;
  readonly appliedPromotionId: string | null;
  readonly appliedCouponCode: string | null;
  readonly snapshot: {
    readonly taxRateBps: number;
    readonly commissionRateBps: number;
    readonly evaluatedAt: string;
  };
}

export interface RecordPromotionUsageInput {
  readonly promotionId: string;
  readonly customerId?: string;
  readonly orderId: string;
  readonly idempotencyKey: string;
}

export interface PricingPort {
  quote(input: PricingQuoteRequest): Promise<PricingQuoteResult>;
  recordUsage(input: RecordPromotionUsageInput): Promise<void>;
}
