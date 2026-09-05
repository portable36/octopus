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
  constructor(message = 'Submitted COD amount does not match the outstanding amount.') {
    super(message, 'COD_AMOUNT_MISMATCH');
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

export class RefundNotRefundableError extends PaymentDomainError {
  constructor(message = 'Payment intent is not refundable.') {
    super(message, 'PAYMENT_NOT_REFUNDABLE');
  }
}

export class RefundExceedsAvailableError extends PaymentDomainError {
  constructor(message = 'Refund amount exceeds remaining refundable balance.') {
    super(message, 'REFUND_EXCEEDS_AVAILABLE');
  }
}

export class InvalidRefundStateError extends PaymentDomainError {
  constructor(message = 'Invalid refund state transition.') {
    super(message, 'INVALID_REFUND_STATE');
  }
}
