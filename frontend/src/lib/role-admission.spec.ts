import { describe, expect, it } from 'vitest';
import { canAccessVendor, hasPlatformAdminRole, hasVendorRole } from './role-admission';

describe('role admission policy', () => {
  it('admits only platform admins to the platform shell', () => {
    expect(hasPlatformAdminRole(['PLATFORM_ADMIN'])).toBe(true);
    expect(hasPlatformAdminRole(['VENDOR_OWNER'])).toBe(false);
  });

  it('admits vendor roles to the vendor picker', () => {
    expect(hasVendorRole(['VENDOR_STAFF'])).toBe(true);
    expect(hasVendorRole(['CUSTOMER'])).toBe(false);
    expect(canAccessVendor(['VENDOR_OWNER'], null, [])).toBe(true);
  });

  it('requires membership for a selected vendor', () => {
    expect(canAccessVendor(['VENDOR_OWNER'], 'vendor-1', ['vendor-1'])).toBe(true);
    expect(canAccessVendor(['VENDOR_OWNER'], 'vendor-2', ['vendor-1'])).toBe(false);
  });
});
