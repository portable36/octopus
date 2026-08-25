import type { Permission } from '../enums/permission.enum';
import { PERMISSIONS } from '../enums/permission.enum';
import type { Role } from '../enums/role.enum';

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  PLATFORM_ADMIN: [...PERMISSIONS],
  VENDOR_OWNER: [
    'catalog.product.read',
    'catalog.product.create',
    'catalog.product.update',
    'inventory.adjust',
    'inventory.read',
    'pricing.read',
    'pricing.write',
    'cart.read',
    'checkout.submit',
    'order.read',
    'order.fulfill',
    'payment.cod.collect',
    'payment.refund.create',
    'return.read',
    'return.review',
    'return.receive',
    'return.inspect',
    'payout.read',
    'payout.request',
    'vendor.manage',
    'store.manage',
    'pos.receipt_template.manage',
    'pos.receipt.view',
    'settings.read',
    'settings.write',
    'media.read',
    'website.read',
  ],
  VENDOR_STAFF: [
    'catalog.product.read',
    'catalog.product.create',
    'catalog.product.update',
    'inventory.adjust',
    'inventory.read',
    'pricing.read',
    'pricing.write',
    'cart.read',
    'order.read',
    'order.fulfill',
    'return.read',
    'return.review',
    'return.receive',
    'return.inspect',
    'pos.receipt.view',
    'settings.read',
    'media.read',
  ],
  STORE_MANAGER: [
    'catalog.product.read',
    'catalog.product.update',
    'inventory.adjust',
    'inventory.read',
    'pricing.read',
    'pricing.write',
    'cart.read',
    'order.read',
    'order.fulfill',
    'payment.cod.collect',
    'payment.refund.create',
    'return.read',
    'return.review',
    'return.receive',
    'return.inspect',
    'store.manage',
    'pos.receipt_template.manage',
    'pos.receipt.view',
    'settings.read',
    'settings.write',
    'media.read',
    'media.write',
    'website.read',
    'website.update',
  ],
  STORE_STAFF: [
    'catalog.product.read',
    'inventory.read',
    'pricing.read',
    'cart.read',
    'order.read',
    'order.fulfill',
    'return.read',
    'return.receive',
    'return.inspect',
    'pos.receipt.view',
    'settings.read',
    'media.read',
  ],
  CUSTOMER: [
    'catalog.product.read',
    'pricing.read',
    'cart.read',
    'cart.write',
    'checkout.submit',
    'order.read',
    'return.read',
    'return.create',
  ],
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
