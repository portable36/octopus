export class FulfillmentAccessDeniedError extends Error {
  readonly code = 'FULFILLMENT_ACCESS_DENIED';
  constructor(message = 'Not authorized for fulfillment.') {
    super(message);
    this.name = 'FulfillmentAccessDeniedError';
  }
}

export class ShipmentNotFoundError extends Error {
  readonly code = 'SHIPMENT_NOT_FOUND';
  constructor(message = 'Shipment was not found.') {
    super(message);
    this.name = 'ShipmentNotFoundError';
  }
}

export class FulfillmentIdempotencyConflictError extends Error {
  readonly code = 'FULFILLMENT_IDEMPOTENCY_CONFLICT';
  constructor(message = 'Idempotency key was reused with a different payload.') {
    super(message);
    this.name = 'FulfillmentIdempotencyConflictError';
  }
}

export class FulfillmentValidationError extends Error {
  readonly code = 'FULFILLMENT_VALIDATION_FAILED';
  constructor(message: string) {
    super(message);
    this.name = 'FulfillmentValidationError';
  }
}

export class CourierProviderError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = 'CourierProviderError';
  }
}
