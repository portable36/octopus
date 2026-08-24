export class CheckoutDomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'CheckoutDomainError';
  }
}

export class CheckoutValidationError extends CheckoutDomainError {
  constructor(
    message: string,
    readonly issues: readonly {
      readonly lineId?: string;
      readonly code: string;
      readonly message: string;
    }[] = [],
  ) {
    super(message, 'CHECKOUT_VALIDATION_FAILED');
  }
}

export class CheckoutCartConflictError extends CheckoutDomainError {
  constructor(message = 'Cart version conflict or cart is not active.') {
    super(message, 'CHECKOUT_CART_CONFLICT');
  }
}

export class CheckoutInventoryError extends CheckoutDomainError {
  constructor(message: string) {
    super(message, 'CHECKOUT_INVENTORY_FAILED');
  }
}

export class CheckoutCouponError extends CheckoutDomainError {
  constructor(message: string) {
    super(message, 'CHECKOUT_COUPON_FAILED');
  }
}
