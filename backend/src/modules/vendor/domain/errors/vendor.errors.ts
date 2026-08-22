export class VendorDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VendorDomainError';
  }
}

export class InvalidVendorStatusTransitionError extends VendorDomainError {
  constructor(from: string, to: string) {
    super(`Invalid vendor status transition: ${from} -> ${to}.`);
    this.name = 'InvalidVendorStatusTransitionError';
  }
}

export class VendorStaffAlreadyExistsError extends VendorDomainError {
  constructor() {
    super('User is already a staff member of this vendor.');
    this.name = 'VendorStaffAlreadyExistsError';
  }
}

export class VendorStaffNotFoundError extends VendorDomainError {
  constructor() {
    super('Staff member not found on this vendor.');
    this.name = 'VendorStaffNotFoundError';
  }
}

export class CannotRemoveLastOwnerError extends VendorDomainError {
  constructor() {
    super('Cannot remove the last vendor owner.');
    this.name = 'CannotRemoveLastOwnerError';
  }
}

export class VendorNotOperableError extends VendorDomainError {
  constructor() {
    super('Vendor is not in an operable commercial status.');
    this.name = 'VendorNotOperableError';
  }
}
