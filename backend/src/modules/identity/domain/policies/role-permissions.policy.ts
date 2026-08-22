import type { Permission } from '../enums/permission.enum';
import type { Role } from '../enums/role.enum';

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  PLATFORM_ADMIN: [
    'catalog.product.read',
    'catalog.product.create',
    'catalog.product.update',
    'inventory.adjust',
    'order.read',
    'order.fulfill',
    'payout.read',
    'payout.request',
    'vendor.manage',
    'store.manage',
  ],
  VENDOR_OWNER: [
    'catalog.product.read',
    'catalog.product.create',
    'catalog.product.update',
    'inventory.adjust',
    'order.read',
    'order.fulfill',
    'payout.read',
    'payout.request',
    'vendor.manage',
    'store.manage',
  ],
  VENDOR_STAFF: [
    'catalog.product.read',
    'catalog.product.create',
    'catalog.product.update',
    'inventory.adjust',
    'order.read',
    'order.fulfill',
  ],
  STORE_MANAGER: [
    'catalog.product.read',
    'catalog.product.update',
    'inventory.adjust',
    'order.read',
    'order.fulfill',
    'store.manage',
  ],
  STORE_STAFF: ['catalog.product.read', 'order.read', 'order.fulfill'],
  CUSTOMER: ['catalog.product.read', 'order.read'],
};

export function permissionsForRoles(roles: readonly Role[]): ReadonlySet<Permission> {
  const granted = new Set<Permission>();

  for (const role of roles) {
    for (const permission of ROLE_PERMISSIONS[role]) {
      granted.add(permission);
    }
  }

  return granted;
}

export function roleHasPermission(roles: readonly Role[], permission: Permission): boolean {
  if (roles.includes('PLATFORM_ADMIN')) {
    return true;
  }

  return permissionsForRoles(roles).has(permission);
}
