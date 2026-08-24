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
  'payout.read',
  'payout.request',
  'vendor.manage',
  'store.manage',
  'pos.receipt_template.manage',
  'pos.receipt.view',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}
