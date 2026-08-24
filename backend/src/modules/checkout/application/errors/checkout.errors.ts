export class CheckoutAccessDeniedError extends Error {
  readonly code = 'CHECKOUT_ACCESS_DENIED';
  constructor() {
    super('Checkout access denied.');
    this.name = 'CheckoutAccessDeniedError';
  }
}

export class CheckoutIdempotencyConflictError extends Error {
  readonly code = 'CHECKOUT_IDEMPOTENCY_CONFLICT';
  constructor() {
    super('Idempotency key is already bound to a different checkout payload.');
    this.name = 'CheckoutIdempotencyConflictError';
  }
}
