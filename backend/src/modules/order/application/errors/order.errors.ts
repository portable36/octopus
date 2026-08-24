export class OrderAccessDeniedError extends Error {
  readonly code = 'ORDER_ACCESS_DENIED';
  constructor() {
    super('Order access denied.');
    this.name = 'OrderAccessDeniedError';
  }
}

export class OrderNotFoundError extends Error {
  readonly code = 'ORDER_NOT_FOUND';
  constructor(message = 'Order was not found.') {
    super(message);
    this.name = 'OrderNotFoundError';
  }
}

export class OrderPaymentMismatchError extends Error {
  readonly code = 'ORDER_PAYMENT_MISMATCH';
  constructor(message = 'Order amount does not match payment collection.') {
    super(message);
    this.name = 'OrderPaymentMismatchError';
  }
}
