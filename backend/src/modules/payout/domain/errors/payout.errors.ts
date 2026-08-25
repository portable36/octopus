export class PayoutDomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'PayoutDomainError';
  }
}

export class InvalidPayoutTransitionError extends PayoutDomainError {
  constructor(from: string, to: string) {
    super(`Cannot transition payout from ${from} to ${to}.`, 'INVALID_PAYOUT_TRANSITION');
    this.name = 'InvalidPayoutTransitionError';
  }
}

export class InsufficientPayoutBalanceError extends PayoutDomainError {
  constructor(availableMinor: number, requestedMinor: number) {
    super(
      `Payout amount ${requestedMinor} exceeds available ${availableMinor}.`,
      'INSUFFICIENT_PAYOUT_BALANCE',
    );
    this.name = 'InsufficientPayoutBalanceError';
  }
}

export class InvalidPayoutAmountError extends PayoutDomainError {
  constructor(message = 'Payout amount must be a positive integer.') {
    super(message, 'INVALID_PAYOUT_AMOUNT');
    this.name = 'InvalidPayoutAmountError';
  }
}

export class InvalidPayoutRejectionError extends PayoutDomainError {
  constructor(message = 'Rejection reason is required.') {
    super(message, 'INVALID_PAYOUT_REJECTION');
    this.name = 'InvalidPayoutRejectionError';
  }
}
