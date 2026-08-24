export class PricingAccessDeniedError extends Error {
  readonly code = 'PRICING_ACCESS_DENIED';
  constructor() {
    super('Pricing access denied.');
    this.name = 'PricingAccessDeniedError';
  }
}

export class PromotionNotFoundError extends Error {
  readonly code = 'PRICING_PROMOTION_NOT_FOUND';
  constructor() {
    super('Promotion was not found.');
    this.name = 'PromotionNotFoundError';
  }
}
