import { describe, expect, it, vi } from 'vitest';
import { Vendor } from '../../domain/aggregates/vendor.aggregate';
import { VendorAccessDeniedError } from '../errors/vendor.errors';
import { VendorLifecycleHandler } from './vendor-lifecycle.handler';

const OWNER = '01900000-0000-7000-8000-000000000010';
const OTHER = '01900000-0000-7000-8000-000000000012';
const ADMIN = '01900000-0000-7000-8000-000000000099';

describe('VendorLifecycleHandler authorization', () => {
  it('denies non-owner staff management', async () => {
    const vendor = Vendor.register({
      displayName: 'Owned Shop',
      legalName: 'Owned Shop Ltd',
      contactEmail: 'a@b.co',
      ownerUserId: OWNER,
    });
    vendor.submitForReview();
    vendor.approve(ADMIN);
    vendor.activate();

    const handler = new VendorLifecycleHandler(
      {
        findById: vi.fn().mockResolvedValue(vendor),
        save: vi.fn(),
        findBySlug: vi.fn(),
        findByOwnerUserId: vi.fn(),
        findByStaffUserId: vi.fn(),
        existsBySlug: vi.fn(),
        listAll: vi.fn(),
      },
      {
        findByUserId: vi.fn(),
        upsertVendorMembership: vi.fn(),
        removeVendorMembership: vi.fn(),
        assignStoreMembership: vi.fn(),
        revokeStoreMembership: vi.fn(),
      },
      { ensureRoles: vi.fn() },
    );

    await expect(
      handler.addStaff(vendor.id.value, OTHER, ['CUSTOMER'], OTHER, 'VENDOR_STAFF'),
    ).rejects.toBeInstanceOf(VendorAccessDeniedError);
  });

  it('allows platform admin approval', async () => {
    const vendor = Vendor.register({
      displayName: 'Review Shop',
      legalName: 'Review Shop Ltd',
      contactEmail: 'a@b.co',
      ownerUserId: OWNER,
    });
    vendor.submitForReview();

    const save = vi.fn().mockResolvedValue(undefined);
    const handler = new VendorLifecycleHandler(
      {
        findById: vi.fn().mockResolvedValue(vendor),
        save,
        findBySlug: vi.fn(),
        findByOwnerUserId: vi.fn(),
        findByStaffUserId: vi.fn(),
        existsBySlug: vi.fn(),
        listAll: vi.fn(),
      },
      {
        findByUserId: vi.fn(),
        upsertVendorMembership: vi.fn(),
        removeVendorMembership: vi.fn(),
        assignStoreMembership: vi.fn(),
        revokeStoreMembership: vi.fn(),
      },
      { ensureRoles: vi.fn() },
    );

    const approved = await handler.approve(vendor.id.value, ADMIN, ['PLATFORM_ADMIN']);
    expect(approved.status).toBe('approved');
    expect(save).toHaveBeenCalled();
  });

  it('denies customer approval attempts', async () => {
    const vendor = Vendor.register({
      displayName: 'Blocked Shop',
      legalName: 'Blocked Shop Ltd',
      contactEmail: 'a@b.co',
      ownerUserId: OWNER,
    });
    vendor.submitForReview();

    const handler = new VendorLifecycleHandler(
      {
        findById: vi.fn().mockResolvedValue(vendor),
        save: vi.fn(),
        findBySlug: vi.fn(),
        findByOwnerUserId: vi.fn(),
        findByStaffUserId: vi.fn(),
        existsBySlug: vi.fn(),
        listAll: vi.fn(),
      },
      {
        findByUserId: vi.fn(),
        upsertVendorMembership: vi.fn(),
        removeVendorMembership: vi.fn(),
        assignStoreMembership: vi.fn(),
        revokeStoreMembership: vi.fn(),
      },
      { ensureRoles: vi.fn() },
    );

    await expect(handler.approve(vendor.id.value, OTHER, ['CUSTOMER'])).rejects.toBeInstanceOf(
      VendorAccessDeniedError,
    );
  });
});
