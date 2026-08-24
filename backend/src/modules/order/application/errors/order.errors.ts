export class OrderAccessDeniedError extends Error {
  readonly code = 'ORDER_ACCESS_DENIED';
  constructor() {
    super('Order access denied.');
    this.name = 'OrderAccessDeniedError';
  }
}

export class OrderNotFoundError extends Error {
  readonly code = 'ORDER_NOT_FOUND';
  constructor() {
    super('Order was not found.');
    this.name = 'OrderNotFoundError';
  }
}
