export class PricingDomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'PricingDomainError';
  }
}

export class InvalidPromotionError extends PricingDomainError {
  constructor(message: string) {
    super(message, 'PRICING_INVALID_PROMOTION');
  }
}

export class CouponNotFoundError extends PricingDomainError {
  constructor() {
    super('Coupon code was not found or is not active.', 'PRICING_COUPON_NOT_FOUND');
  }
}

export class CouponExpiredError extends PricingDomainError {
  constructor() {
    super('Coupon has expired.', 'PRICING_COUPON_EXPIRED');
  }
}

export class CouponNotYetActiveError extends PricingDomainError {
  constructor() {
    super('Coupon is not active yet.', 'PRICING_COUPON_NOT_YET_ACTIVE');
  }
}

export class CouponUsageLimitReachedError extends PricingDomainError {
  constructor() {
    super('Coupon usage limit has been reached.', 'PRICING_COUPON_USAGE_LIMIT');
  }
}

export class CouponCustomerLimitReachedError extends PricingDomainError {
  constructor() {
    super('Customer coupon usage limit has been reached.', 'PRICING_COUPON_CUSTOMER_LIMIT');
  }
}

export class CouponVendorRestrictionError extends PricingDomainError {
  constructor() {
    super('Coupon does not apply to this vendor.', 'PRICING_COUPON_VENDOR_RESTRICTED');
  }
}

export class CouponStoreRestrictionError extends PricingDomainError {
  constructor() {
    super('Coupon does not apply to this store.', 'PRICING_COUPON_STORE_RESTRICTED');
  }
}

export class CouponMinOrderError extends PricingDomainError {
  constructor(readonly minOrderAmountMinor: number) {
    super(
      `Order subtotal does not meet coupon minimum of ${minOrderAmountMinor} minor units.`,
      'PRICING_COUPON_MIN_ORDER',
    );
  }
}

export class CurrencyMismatchError extends PricingDomainError {
  constructor() {
    super('Currency mismatch in pricing inputs.', 'PRICING_CURRENCY_MISMATCH');
  }
}

export class InvalidMoneyInputError extends PricingDomainError {
  constructor(message: string) {
    super(message, 'PRICING_INVALID_MONEY');
  }
}
