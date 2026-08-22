import { describe, expect, it } from 'vitest';
import {
  getCurrentTenantId,
  getTenantContext,
  runWithTenantContext,
  tryGetTenantContext,
} from './tenant-context.storage';

describe('tenant context storage', () => {
  it('exposes the context inside the run scope', () => {
    const result = runWithTenantContext({ tenantId: 't-1', requestId: 'r-1' }, () =>
      getTenantContext(),
    );
    expect(result.tenantId).toBe('t-1');
    expect(result.requestId).toBe('r-1');
  });

  it('returns undefined outside of a request scope', () => {
    expect(tryGetTenantContext()).toBeUndefined();
    expect(() => getTenantContext()).toThrow('not available');
  });

  it('fails closed when a request has no authenticated tenant', () => {
    expect(() => runWithTenantContext({ requestId: 'r-1' }, () => getCurrentTenantId())).toThrow(
      'Authenticated tenant context is not available',
    );
  });
});
