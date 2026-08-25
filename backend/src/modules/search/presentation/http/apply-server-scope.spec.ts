import { describe, expect, it } from 'vitest';
import {
  createRequestContext,
  runWithTenantContext,
  setStoreScope,
  setVendorScope,
} from '../../../../shared-kernel/infrastructure/context/tenant-context.storage';
import { applyServerScope } from './search.controller';

describe('applyServerScope', () => {
  it('uses query vendor/store when tenant context has none', () => {
    const scoped = applyServerScope({
      vendorId: '11111111-1111-7111-8111-111111111111',
      storeId: '22222222-2222-7222-8222-222222222222',
      q: 'tee',
    });
    expect(scoped.vendorId).toBe('11111111-1111-7111-8111-111111111111');
    expect(scoped.storeId).toBe('22222222-2222-7222-8222-222222222222');
    expect(scoped.q).toBe('tee');
  });

  it('prefers server tenant scope over client query params', () => {
    runWithTenantContext(createRequestContext('r-1'), () => {
      setVendorScope(
        'aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaaaa',
        'aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaaaa',
      );
      setStoreScope('bbbbbbbb-bbbb-7bbb-8bbb-bbbbbbbbbbbb');
      const scoped = applyServerScope({
        vendorId: '11111111-1111-7111-8111-111111111111',
        storeId: '22222222-2222-7222-8222-222222222222',
      });
      expect(scoped.vendorId).toBe('aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaaaa');
      expect(scoped.storeId).toBe('bbbbbbbb-bbbb-7bbb-8bbb-bbbbbbbbbbbb');
    });
  });
});
