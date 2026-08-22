export const ROLES = [
  'PLATFORM_ADMIN',
  'VENDOR_OWNER',
  'VENDOR_STAFF',
  'STORE_MANAGER',
  'STORE_STAFF',
  'CUSTOMER',
] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}
