export class PayoutAccessDeniedError extends Error {
  readonly code = 'PAYOUT_ACCESS_DENIED';
  constructor(message = 'Not authorized for payout operation.') {
    super(message);
    this.name = 'PayoutAccessDeniedError';
  }
}

export class PayoutNotFoundError extends Error {
  readonly code = 'PAYOUT_NOT_FOUND';
  constructor(message = 'Payout not found.') {
    super(message);
    this.name = 'PayoutNotFoundError';
  }
}

export class PayoutIdempotencyConflictError extends Error {
  readonly code = 'PAYOUT_IDEMPOTENCY_CONFLICT';
  constructor(message = 'Idempotency key already used for a different payout request.') {
    super(message);
    this.name = 'PayoutIdempotencyConflictError';
  }
}
