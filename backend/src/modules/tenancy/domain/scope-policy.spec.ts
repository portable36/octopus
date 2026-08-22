import { describe, expect, it } from 'vitest';
import {
  assertCustomerCannotAccessVendorResources,
  assertStoreAccess,
  assertVendorAccess,
  resolveActorScope,
} from './scope-policy';
import {
  MissingVendorScopeError,
  PlatformScopeForbiddenError,
  StoreScopeForbiddenError,
  VendorScopeForbiddenError,
} from './scope.types';

const vendorA = '01900000-0000-7000-8000-000000000101';
const vendorB = '01900000-0000-7000-8000-000000000102';
const storeA = '01900000-0000-7000-8000-000000000201';
const storeB = '01900000-0000-7000-8000-000000000202';

describe('scope policy', () => {
  it('denies vendor A from reading vendor B scope', () => {
    expect(() =>
      resolveActorScope({
        membership: {
          userId: 'user-a',
          roles: ['VENDOR_OWNER'],
          vendorId: vendorA,
          storeIds: [],
        },
        requestedVendorId: vendorB,
      }),
    ).toThrow(VendorScopeForbiddenError);
  });

  it('denies vendor A from modifying vendor B resources via assertVendorAccess', () => {
    expect(() =>
      assertVendorAccess(
        {
          userId: 'user-a',
          roles: ['VENDOR_OWNER'],
          vendorId: vendorA,
          storeIds: [],
        },
        vendorB,
      ),
    ).toThrow(VendorScopeForbiddenError);
  });

  it('denies store A from accessing store B', () => {
    expect(() =>
      resolveActorScope({
        membership: {
          userId: 'staff-a',
          roles: ['STORE_STAFF'],
          vendorId: vendorA,
          storeIds: [storeA],
        },
        requestedVendorId: vendorA,
        requestedStoreId: storeB,
      }),
    ).toThrow(StoreScopeForbiddenError);
  });

  it('prevents store managers from escaping assigned stores', () => {
    expect(() =>
      assertStoreAccess(
        {
          userId: 'manager-a',
          roles: ['STORE_MANAGER'],
          vendorId: vendorA,
          storeIds: [storeA],
        },
        storeB,
        vendorA,
      ),
    ).toThrow(StoreScopeForbiddenError);
  });

  it('denies customers access to vendor resources', () => {
    expect(() => assertCustomerCannotAccessVendorResources(['CUSTOMER'])).toThrow(
      VendorScopeForbiddenError,
    );

    expect(() =>
      resolveActorScope({
        membership: {
          userId: 'customer-1',
          roles: ['CUSTOMER'],
          storeIds: [],
        },
        requestedVendorId: vendorA,
      }),
    ).toThrow(VendorScopeForbiddenError);
  });

  it('allows explicit platform admin scope', () => {
    const scope = resolveActorScope({
      membership: {
        userId: 'admin-1',
        roles: ['PLATFORM_ADMIN'],
        storeIds: [],
      },
      requestPlatformScope: true,
    });

    expect(scope.platformScope).toBe(true);
    expect(scope.kind).toBe('platform');
  });

  it('rejects platform scope for non-admin actors', () => {
    expect(() =>
      resolveActorScope({
        membership: {
          userId: 'user-a',
          roles: ['VENDOR_OWNER'],
          vendorId: vendorA,
          storeIds: [],
        },
        requestPlatformScope: true,
      }),
    ).toThrow(PlatformScopeForbiddenError);
  });

  it('requires vendor scope for staff without membership default', () => {
    expect(() =>
      resolveActorScope({
        membership: {
          userId: 'staff-x',
          roles: ['VENDOR_STAFF'],
          storeIds: [],
        },
      }),
    ).toThrow(MissingVendorScopeError);
  });
});
