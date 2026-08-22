import {
  MissingVendorScopeError,
  PlatformScopeForbiddenError,
  StoreScopeForbiddenError,
  VendorScopeForbiddenError,
  type ActorMembership,
  type ResolvedScope,
} from './scope.types';

export function resolveActorScope(input: {
  readonly membership: ActorMembership;
  readonly requestedVendorId?: string;
  readonly requestedStoreId?: string;
  readonly requestPlatformScope?: boolean;
}): ResolvedScope {
  const { membership, requestedVendorId, requestedStoreId, requestPlatformScope } = input;
  const roles = membership.roles;

  if (requestPlatformScope === true) {
    if (!roles.includes('PLATFORM_ADMIN')) {
      throw new PlatformScopeForbiddenError();
    }

    return {
      kind: 'platform',
      platformScope: true,
    };
  }

  if (roles.includes('PLATFORM_ADMIN') && !requestedVendorId && !requestedStoreId) {
    return {
      kind: 'platform',
      platformScope: true,
    };
  }

  if (requestedStoreId) {
    assertStoreAccess(membership, requestedStoreId, requestedVendorId);
    const vendorId = requestedVendorId ?? membership.vendorId;
    if (!vendorId) {
      throw new MissingVendorScopeError();
    }

    return {
      kind: 'store',
      vendorId,
      storeId: requestedStoreId,
      tenantId: vendorId,
      platformScope: false,
    };
  }

  if (requestedVendorId) {
    assertVendorAccess(membership, requestedVendorId);
    return {
      kind: 'vendor',
      vendorId: requestedVendorId,
      tenantId: requestedVendorId,
      platformScope: false,
    };
  }

  if (membership.vendorId) {
    return {
      kind: 'vendor',
      vendorId: membership.vendorId,
      tenantId: membership.vendorId,
      platformScope: false,
    };
  }

  if (roles.includes('CUSTOMER') || roles.length === 0) {
    return {
      kind: 'customer',
      platformScope: false,
    };
  }

  throw new MissingVendorScopeError();
}

export function assertVendorAccess(membership: ActorMembership, vendorId: string): void {
  if (membership.roles.includes('PLATFORM_ADMIN')) {
    return;
  }

  if (!membership.vendorId || membership.vendorId !== vendorId) {
    throw new VendorScopeForbiddenError();
  }
}

export function assertStoreAccess(
  membership: ActorMembership,
  storeId: string,
  vendorId?: string,
): void {
  if (membership.roles.includes('PLATFORM_ADMIN')) {
    return;
  }

  if (vendorId) {
    assertVendorAccess(membership, vendorId);
  } else if (!membership.vendorId) {
    throw new MissingVendorScopeError();
  }

  if (hasVendorWideRole(membership.roles)) {
    return;
  }

  if (!membership.storeIds.includes(storeId)) {
    throw new StoreScopeForbiddenError();
  }
}

export function assertCustomerCannotAccessVendorResources(roles: readonly string[]): void {
  if (roles.includes('CUSTOMER') && !hasAnyStaffRole(roles)) {
    throw new VendorScopeForbiddenError();
  }
}

function hasVendorWideRole(roles: readonly string[]): boolean {
  return roles.includes('VENDOR_OWNER') || roles.includes('VENDOR_STAFF');
}

function hasAnyStaffRole(roles: readonly string[]): boolean {
  return roles.some((role) =>
    ['PLATFORM_ADMIN', 'VENDOR_OWNER', 'VENDOR_STAFF', 'STORE_MANAGER', 'STORE_STAFF'].includes(
      role,
    ),
  );
}
