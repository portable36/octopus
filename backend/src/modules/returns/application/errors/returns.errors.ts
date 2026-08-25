export class ReturnsAccessDeniedError extends Error {
  constructor(message = 'Return access denied.') {
    super(message);
    this.name = 'ReturnsAccessDeniedError';
  }
}

export class ReturnNotFoundError extends Error {
  constructor(message = 'Return not found.') {
    super(message);
    this.name = 'ReturnNotFoundError';
  }
}

export class ReturnsIdempotencyConflictError extends Error {
  constructor(message = 'Idempotency key conflict.') {
    super(message);
    this.name = 'ReturnsIdempotencyConflictError';
  }
}
