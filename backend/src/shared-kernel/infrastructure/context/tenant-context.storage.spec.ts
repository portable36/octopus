import { describe, expect, it } from 'vitest';
import {
  createRequestContext,
  getTenantContext,
  runWithTenantContext,
  setAuthenticatedPrincipal,
  setPlatformScope,
  setStoreScope,
  setVendorScope,
  tryGetTenantContext,
} from './tenant-context.storage';

describe('tenant context storage', () => {
  it('exposes the context inside the run scope', () => {
    const result = runWithTenantContext(createRequestContext('r-1'), () => getTenantContext());
    expect(result.requestId).toBe('r-1');
  });

  it('returns undefined outside of a request scope', () => {
    expect(tryGetTenantContext()).toBeUndefined();
    expect(() => getTenantContext()).toThrow('not available');
  });

  it('tracks principal, vendor, store, and platform scope', () => {
    runWithTenantContext(createRequestContext('r-1'), () => {
      setAuthenticatedPrincipal({
        userId: 'user-1',
        email: 'a@b.co',
        roles: ['VENDOR_OWNER'],
      });
      setVendorScope('vendor-a', 'tenant-a');
      setStoreScope('store-a');

      const context = getTenantContext();
      expect(context.userId).toBe('user-1');
      expect(context.vendorId).toBe('vendor-a');
      expect(context.storeId).toBe('store-a');
      expect(context.tenantId).toBe('tenant-a');

      setPlatformScope(true);
      expect(getTenantContext().platformScope).toBe(true);
      expect(getTenantContext().vendorId).toBeUndefined();
    });
  });
});
