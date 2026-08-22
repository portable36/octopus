export type ScopeKind = 'platform' | 'vendor' | 'store' | 'customer';

export interface ResolvedScope {
  readonly kind: ScopeKind;
  readonly tenantId?: string;
  readonly vendorId?: string;
  readonly storeId?: string;
  readonly platformScope: boolean;
}

export class TenancyScopeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'TenancyScopeError';
  }
}

export class MissingVendorScopeError extends TenancyScopeError {
  constructor() {
    super('Vendor scope is required for this action.', 'MISSING_VENDOR_SCOPE');
  }
}

export class MissingStoreScopeError extends TenancyScopeError {
  constructor() {
    super('Store scope is required for this action.', 'MISSING_STORE_SCOPE');
  }
}

export class VendorScopeForbiddenError extends TenancyScopeError {
  constructor() {
    super('Actor is not allowed to access this vendor.', 'VENDOR_SCOPE_FORBIDDEN');
  }
}

export class StoreScopeForbiddenError extends TenancyScopeError {
  constructor() {
    super('Actor is not allowed to access this store.', 'STORE_SCOPE_FORBIDDEN');
  }
}

export class PlatformScopeForbiddenError extends TenancyScopeError {
  constructor() {
    super('Platform scope requires PLATFORM_ADMIN.', 'PLATFORM_SCOPE_FORBIDDEN');
  }
}

export interface ActorMembership {
  readonly userId: string;
  readonly roles: readonly string[];
  readonly vendorId?: string;
  readonly storeIds: readonly string[];
}
