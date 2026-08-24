export class CartDomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'CartDomainError';
  }
}

export class InvalidCartQuantityError extends CartDomainError {
  constructor(message = 'Cart line quantity must be a positive integer within limits.') {
    super(message, 'CART_INVALID_QUANTITY');
  }
}

export class CartNotActiveError extends CartDomainError {
  constructor() {
    super('Cart is not active.', 'CART_NOT_ACTIVE');
  }
}

export class CartLineNotFoundError extends CartDomainError {
  constructor() {
    super('Cart line was not found.', 'CART_LINE_NOT_FOUND');
  }
}

export class CartCurrencyMismatchError extends CartDomainError {
  constructor() {
    super('Cart lines must share one currency.', 'CART_CURRENCY_MISMATCH');
  }
}

export class CartVendorIsolationError extends CartDomainError {
  constructor() {
    super('Line vendor/store does not match the store offer ownership.', 'CART_VENDOR_ISOLATION');
  }
}
