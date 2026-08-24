export class PosApplicationError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'PosApplicationError';
  }
}

export class PosAccessDeniedError extends PosApplicationError {
  constructor() {
    super('POS access denied for this store.', 'POS_ACCESS_DENIED');
    this.name = 'PosAccessDeniedError';
  }
}

export class PosStoreNotFoundError extends PosApplicationError {
  constructor() {
    super('Store not found.', 'POS_STORE_NOT_FOUND');
    this.name = 'PosStoreNotFoundError';
  }
}

export class ReceiptNotFoundError extends PosApplicationError {
  constructor() {
    super('Receipt not found.', 'RECEIPT_NOT_FOUND');
    this.name = 'ReceiptNotFoundError';
  }
}

export class ReceiptAlreadyExistsError extends PosApplicationError {
  constructor() {
    super('A receipt already exists for this sale.', 'RECEIPT_ALREADY_EXISTS');
    this.name = 'ReceiptAlreadyExistsError';
  }
}
