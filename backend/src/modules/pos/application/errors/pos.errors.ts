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

export class RegisterNotFoundError extends PosApplicationError {
  constructor() {
    super('Register not found.', 'REGISTER_NOT_FOUND');
    this.name = 'RegisterNotFoundError';
  }
}

export class RegisterCodeAlreadyExistsError extends PosApplicationError {
  constructor(code: string) {
    super(
      `Register with code "${code}" already exists for this store.`,
      'REGISTER_CODE_ALREADY_EXISTS',
    );
    this.name = 'RegisterCodeAlreadyExistsError';
  }
}

export class RegisterInactiveError extends PosApplicationError {
  constructor() {
    super('Register is not active.', 'REGISTER_INACTIVE');
    this.name = 'RegisterInactiveError';
  }
}

export class ShiftNotFoundError extends PosApplicationError {
  constructor() {
    super('Shift not found.', 'SHIFT_NOT_FOUND');
    this.name = 'ShiftNotFoundError';
  }
}

export class RegisterShiftAlreadyOpenError extends PosApplicationError {
  constructor() {
    super('Register already has an active open shift.', 'REGISTER_SHIFT_ALREADY_OPEN');
    this.name = 'RegisterShiftAlreadyOpenError';
  }
}

export class ShiftAlreadyClosedError extends PosApplicationError {
  constructor() {
    super('Shift is already closed.', 'SHIFT_ALREADY_CLOSED');
    this.name = 'ShiftAlreadyClosedError';
  }
}

export class ShiftCashierMismatchError extends PosApplicationError {
  constructor() {
    super(
      'Only the operating cashier or a store manager can close this shift.',
      'SHIFT_CASHIER_MISMATCH',
    );
    this.name = 'ShiftCashierMismatchError';
  }
}
