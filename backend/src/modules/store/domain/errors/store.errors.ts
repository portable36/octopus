export class StoreDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StoreDomainError';
  }
}

export class InvalidStoreStatusTransitionError extends StoreDomainError {
  constructor(from: string, to: string) {
    super(`Invalid store status transition: ${from} -> ${to}.`);
    this.name = 'InvalidStoreStatusTransitionError';
  }
}

export class StoreStaffAlreadyExistsError extends StoreDomainError {
  constructor() {
    super('User is already a staff member of this store.');
    this.name = 'StoreStaffAlreadyExistsError';
  }
}

export class StoreStaffNotFoundError extends StoreDomainError {
  constructor() {
    super('Staff member not found on this store.');
    this.name = 'StoreStaffNotFoundError';
  }
}

export class CannotRemoveLastManagerError extends StoreDomainError {
  constructor() {
    super('Cannot remove the last store manager.');
    this.name = 'CannotRemoveLastManagerError';
  }
}

export class StoreNotOperableError extends StoreDomainError {
  constructor() {
    super('Store is not in an operable commercial status.');
    this.name = 'StoreNotOperableError';
  }
}

export class DuplicateStoreCodeError extends StoreDomainError {
  constructor() {
    super('Store code already exists for this vendor.');
    this.name = 'DuplicateStoreCodeError';
  }
}

export class StoreClosedError extends StoreDomainError {
  constructor() {
    super('Closed stores cannot be mutated.');
    this.name = 'StoreClosedError';
  }
}
