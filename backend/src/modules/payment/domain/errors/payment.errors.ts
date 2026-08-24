export class PaymentDomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'PaymentDomainError';
  }
}

export class CodNotAvailableError extends PaymentDomainError {
  constructor(message = 'Cash on delivery is not available for this order.') {
    super(message, 'COD_NOT_AVAILABLE');
  }
}

export class CodAmountMismatchError extends PaymentDomainError {
  constructor() {
    super('Submitted COD amount does not match the outstanding amount.', 'COD_AMOUNT_MISMATCH');
  }
}

export class CodAlreadyCollectedError extends PaymentDomainError {
  constructor() {
    super('COD payment has already been collected.', 'COD_ALREADY_COLLECTED');
  }
}

export class CodNotCollectibleError extends PaymentDomainError {
  constructor(message = 'COD payment is not in a collectible state.') {
    super(message, 'COD_PAYMENT_NOT_COLLECTIBLE');
  }
}

export class CodCancelledError extends PaymentDomainError {
  constructor() {
    super('COD payment was cancelled.', 'COD_CANCELLED');
  }
}

export class InvalidPaymentMethodError extends PaymentDomainError {
  constructor(message = 'Invalid payment method.') {
    super(message, 'INVALID_PAYMENT_METHOD');
  }
}

export class InvalidPaymentMoneyError extends PaymentDomainError {
  constructor(message: string) {
    super(message, 'INVALID_CURRENCY');
  }
}
