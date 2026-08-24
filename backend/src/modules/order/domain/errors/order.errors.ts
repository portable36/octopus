export class OrderDomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'OrderDomainError';
  }
}

export class InvalidOrderTransitionError extends OrderDomainError {
  constructor(from: string, to: string) {
    super(`Invalid order transition from ${from} to ${to}.`, 'ORDER_INVALID_TRANSITION');
  }
}

export class InvalidOrderFulfillmentError extends OrderDomainError {
  constructor(message: string) {
    super(message, 'ORDER_INVALID_FULFILLMENT');
  }
}

export class InvalidOrderSnapshotError extends OrderDomainError {
  constructor(message: string) {
    super(message, 'ORDER_INVALID_SNAPSHOT');
  }
}
