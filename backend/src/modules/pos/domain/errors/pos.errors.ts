export class PosDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PosDomainError';
  }
}

export class InvalidReceiptTemplateError extends PosDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidReceiptTemplateError';
  }
}

export class InvalidReceiptSnapshotError extends PosDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidReceiptSnapshotError';
  }
}
