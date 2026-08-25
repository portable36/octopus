export class ReturnDomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'ReturnDomainError';
  }
}

export class InvalidReturnTransitionError extends ReturnDomainError {
  constructor(from: string, to: string) {
    super(`Cannot transition return from ${from} to ${to}.`, 'INVALID_RETURN_TRANSITION');
    this.name = 'InvalidReturnTransitionError';
  }
}

export class ReturnQuantityExceededError extends ReturnDomainError {
  constructor(message = 'Requested quantity exceeds returnable quantity.') {
    super(message, 'RETURN_QUANTITY_EXCEEDED');
    this.name = 'ReturnQuantityExceededError';
  }
}

export class ReturnWindowExpiredError extends ReturnDomainError {
  constructor() {
    super('Return window has expired.', 'RETURN_WINDOW_EXPIRED');
    this.name = 'ReturnWindowExpiredError';
  }
}

export class ReturnNotReturnableError extends ReturnDomainError {
  constructor(message: string) {
    super(message, 'ORDER_NOT_RETURNABLE');
    this.name = 'ReturnNotReturnableError';
  }
}

export class InvalidReturnInspectionError extends ReturnDomainError {
  constructor(message: string) {
    super(message, 'INVALID_RETURN_INSPECTION');
    this.name = 'InvalidReturnInspectionError';
  }
}

export class InvalidReturnReasonError extends ReturnDomainError {
  constructor(code: string) {
    super(`Unknown or inactive return reason: ${code}.`, 'INVALID_RETURN_REASON');
    this.name = 'InvalidReturnReasonError';
  }
}
