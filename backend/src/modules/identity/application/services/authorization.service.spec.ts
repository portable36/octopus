import { describe, expect, it } from 'vitest';
import { AuthorizationService } from './authorization.service';
import { ForbiddenPermissionError, ForbiddenRoleError } from '../errors/identity.errors';

describe('AuthorizationService', () => {
  const service = new AuthorizationService();

  it('grants platform admin every permission', () => {
    expect(service.hasPermission(['PLATFORM_ADMIN'], 'vendor.manage')).toBe(true);
    expect(service.hasPermission(['PLATFORM_ADMIN'], 'settings.write')).toBe(true);
  });

  it('denies customer vendor management', () => {
    expect(service.hasPermission(['CUSTOMER'], 'vendor.manage')).toBe(false);
    expect(() => service.assertPermission(['CUSTOMER'], 'vendor.manage')).toThrow(
      ForbiddenPermissionError,
    );
  });

  it('denies vendor owner platform vendor list permission', () => {
    expect(service.hasPermission(['VENDOR_OWNER'], 'platform.vendors.read')).toBe(false);
  });

  it('allows vendor owner settings.write for non-platform scopes (scope checks elsewhere)', () => {
    expect(service.hasPermission(['VENDOR_OWNER'], 'settings.write')).toBe(true);
  });

  it('asserts role membership', () => {
    expect(() => service.assertAnyRole(['CUSTOMER'], ['PLATFORM_ADMIN', 'VENDOR_OWNER'])).toThrow(
      ForbiddenRoleError,
    );
  });
});
