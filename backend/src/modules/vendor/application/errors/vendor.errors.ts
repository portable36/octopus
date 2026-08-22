export class VendorApplicationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'VendorApplicationError';
  }
}

export class VendorNotFoundError extends VendorApplicationError {
  constructor() {
    super('Vendor not found.', 'VENDOR_NOT_FOUND');
  }
}

export class VendorSlugTakenError extends VendorApplicationError {
  constructor() {
    super('Vendor slug is already taken.', 'VENDOR_SLUG_TAKEN');
  }
}

export class VendorAccessDeniedError extends VendorApplicationError {
  constructor() {
    super('Not authorized for this vendor action.', 'VENDOR_ACCESS_DENIED');
  }
}
