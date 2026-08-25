export class LedgerDomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'LedgerDomainError';
  }
}

export class InvalidLedgerAdjustmentError extends LedgerDomainError {
  constructor(message: string) {
    super(message, 'INVALID_LEDGER_ADJUSTMENT');
    this.name = 'InvalidLedgerAdjustmentError';
  }
}
