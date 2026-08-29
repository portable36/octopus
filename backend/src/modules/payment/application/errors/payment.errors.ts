export class PaymentAccessDeniedError extends Error {
  readonly code = 'COD_COLLECTION_FORBIDDEN';
  constructor(message = 'Not authorized to collect this COD payment.') {
    super(message);
    this.name = 'PaymentAccessDeniedError';
  }
}

export class PaymentNotFoundError extends Error {
  readonly code = 'PAYMENT_INTENT_NOT_FOUND';
  constructor(message = 'Payment intent was not found.') {
    super(message);
    this.name = 'PaymentNotFoundError';
  }
}

export class PaymentIdempotencyConflictError extends Error {
  readonly code = 'PAYMENT_IDEMPOTENCY_CONFLICT';
  constructor(message = 'Idempotency key was reused with a different payload.') {
    super(message);
    this.name = 'PaymentIdempotencyConflictError';
  }
}

export class PaymentProviderUnavailableError extends Error {
  readonly code = 'PAYMENT_PROVIDER_UNAVAILABLE';

  constructor(message = 'Online payment providers are not configured.') {
    super(message);
    this.name = 'PaymentProviderUnavailableError';
  }
}
