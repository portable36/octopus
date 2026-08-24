export const PERMISSIONS = [
  'catalog.product.read',
  'catalog.product.create',
  'catalog.product.update',
  'inventory.adjust',
  'inventory.read',
  'pricing.read',
  'pricing.write',
  'cart.read',
  'cart.write',
  'checkout.submit',
  'order.read',
  'order.fulfill',
  'payment.cod.collect',
  'payout.read',
  'payout.request',
  'vendor.manage',
  'store.manage',
  'pos.receipt_template.manage',
  'pos.receipt.view',
  'platform.dashboard.read',
  'platform.vendors.read',
  'platform.stores.read',
  'settings.read',
  'settings.write',
  'audit.read',
  'media.read',
  'media.write',
  'website.read',
  'website.update',
  'website.publish',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}
