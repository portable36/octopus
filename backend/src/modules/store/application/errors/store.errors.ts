export class StoreApplicationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'StoreApplicationError';
  }
}

export class StoreNotFoundError extends StoreApplicationError {
  constructor() {
    super('Store not found.', 'STORE_NOT_FOUND');
  }
}

export class StoreSlugTakenError extends StoreApplicationError {
  constructor() {
    super('Store slug is already taken for this vendor.', 'STORE_SLUG_TAKEN');
  }
}

export class StoreAccessDeniedError extends StoreApplicationError {
  constructor() {
    super('Not authorized for this store action.', 'STORE_ACCESS_DENIED');
  }
}

export class VendorNotFoundForStoreError extends StoreApplicationError {
  constructor() {
    super('Vendor not found for store operation.', 'VENDOR_NOT_FOUND');
  }
}

export class VendorNotActiveForStoreError extends StoreApplicationError {
  constructor() {
    super('Vendor must be active before creating or activating stores.', 'VENDOR_NOT_ACTIVE');
  }
}
