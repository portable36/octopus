import { describe, expect, it } from 'vitest';
import { resolvePostLoginDestination } from './auth-destination';

describe('resolvePostLoginDestination', () => {
  it('routes customers to the account dashboard', () => {
    expect(
      resolvePostLoginDestination({
        user: { roles: ['CUSTOMER'], mfaEnabled: false },
        vendorIds: [],
      }),
    ).toBe('/account');
  });

  it('routes a single-vendor user to that vendor dashboard', () => {
    expect(
      resolvePostLoginDestination({
        user: { roles: ['VENDOR_OWNER'], mfaEnabled: false },
        vendorIds: ['vendor-1'],
      }),
    ).toBe('/vendor/vendor-1');
  });

  it('routes a multi-vendor user to the vendor picker', () => {
    expect(
      resolvePostLoginDestination({
        user: { roles: ['VENDOR_OWNER'], mfaEnabled: false },
        vendorIds: ['vendor-1', 'vendor-2'],
      }),
    ).toBe('/vendor');
  });

  it('routes a platform admin with MFA to the admin dashboard', () => {
    expect(
      resolvePostLoginDestination({
        user: { roles: ['PLATFORM_ADMIN'], mfaEnabled: true },
        vendorIds: [],
      }),
    ).toBe('/admin/dashboard');
  });

  it('requires MFA enrollment before platform admin access', () => {
    expect(
      resolvePostLoginDestination({
        user: { roles: ['PLATFORM_ADMIN'], mfaEnabled: false },
        vendorIds: [],
        next: '/admin/orders',
      }),
    ).toBe('/mfa/setup');
  });

  it('rejects an external or unauthorized next destination', () => {
    expect(
      resolvePostLoginDestination({
        user: { roles: ['CUSTOMER'], mfaEnabled: false },
        vendorIds: [],
        next: '//external.example/admin',
      }),
    ).toBe('/account');

    expect(
      resolvePostLoginDestination({
        user: { roles: ['VENDOR_OWNER'], mfaEnabled: false },
        vendorIds: ['vendor-1'],
        next: '/vendor/vendor-2/orders',
      }),
    ).toBe('/vendor/vendor-1');
  });
});
