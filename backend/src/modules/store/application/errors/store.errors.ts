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

export class StoreDraftNotFoundError extends StoreApplicationError {
  constructor() {
    super('Store onboarding draft not found.', 'STORE_DRAFT_NOT_FOUND');
  }
}

export class StoreDraftValidationError extends StoreApplicationError {
  constructor(
    public readonly issues: readonly { readonly field: string; readonly message: string }[],
  ) {
    super('Store draft validation failed.', 'STORE_DRAFT_VALIDATION_FAILED');
  }
}

export class StoreDomainTakenError extends StoreApplicationError {
  constructor() {
    super('Store domain hostname is already taken.', 'STORE_DOMAIN_TAKEN');
  }
}

export class StoreProvisioningIncompleteError extends StoreApplicationError {
  constructor() {
    super('Store provisioning is not complete.', 'STORE_PROVISIONING_INCOMPLETE');
  }
}

export class StoreProvisioningNotFoundError extends StoreApplicationError {
  constructor() {
    super('No provisioning run found for this store.', 'STORE_PROVISIONING_NOT_FOUND');
  }
}
