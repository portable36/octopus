import { describe, expect, it } from 'vitest';
import {
  createRequestContext,
  runWithTenantContext,
  setAuthenticatedPrincipal,
  setStoreScope,
  setVendorScope,
} from '../context/tenant-context.storage';
import { buildRequestLogBindings, extractErrorCode } from './pino-request-bindings';

describe('buildRequestLogBindings', () => {
  it('includes actor/vendor/store and operation from ALS + request', () => {
    const bindings = runWithTenantContext(createRequestContext('req-1', 'trace-1'), () => {
      setAuthenticatedPrincipal({
        userId: 'user-1',
        email: 'a@b.co',
        roles: ['PLATFORM_ADMIN'],
      });
      setVendorScope('vendor-1', 'tenant-1');
      setStoreScope('store-1');
      return buildRequestLogBindings({
        id: 'req-1',
        method: 'POST',
        url: '/api/v1/ignored',
        route: { path: '/api/v1/vendors/:id/approve' },
      });
    });

    expect(bindings).toEqual({
      requestId: 'req-1',
      traceId: 'trace-1',
      operation: 'POST /api/v1/vendors/:id/approve',
      actorId: 'user-1',
      vendorId: 'vendor-1',
      storeId: 'store-1',
      tenantId: 'tenant-1',
    });
  });

  it('falls back to request id when context is absent', () => {
    expect(buildRequestLogBindings({ id: 'from-pino', method: 'GET', url: '/health' })).toEqual({
      requestId: 'from-pino',
      traceId: 'from-pino',
      operation: 'GET /health',
    });
  });
});

describe('extractErrorCode', () => {
  it('reads domain error codes', () => {
    expect(extractErrorCode({ code: 'VENDOR_NOT_FOUND' })).toBe('VENDOR_NOT_FOUND');
    expect(extractErrorCode(new Error('nope'))).toBeUndefined();
  });
});
