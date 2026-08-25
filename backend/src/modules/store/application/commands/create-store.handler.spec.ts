import { describe, expect, it, vi } from 'vitest';
import { CreateStoreHandler } from './create-store.handler';
import {
  StoreAccessDeniedError,
  VendorNotActiveForStoreError,
  VendorNotFoundForStoreError,
} from '../errors/store.errors';

const OWNER = '01900000-0000-7000-8000-000000000010';
const OTHER = '01900000-0000-7000-8000-000000000011';
const VENDOR_ID = '01900000-0000-7000-8000-000000000001';

describe('CreateStoreHandler', () => {
  it('rejects missing vendor', async () => {
    const handler = new CreateStoreHandler(
      {
        save: vi.fn(),
        existsByVendorAndSlug: vi.fn(),
        findById: vi.fn(),
        findByVendorId: vi.fn(),
        findByStaffUserId: vi.fn(),
        listAll: vi.fn(),
        findActiveBySlug: vi.fn(),
      },
      { findById: vi.fn().mockResolvedValue(null) },
      {
        assignStoreMembership: vi.fn(),
        findByUserId: vi.fn(),
        upsertVendorMembership: vi.fn(),
        removeVendorMembership: vi.fn(),
        revokeStoreMembership: vi.fn(),
      },
      { ensureRoles: vi.fn() },
    );

    await expect(
      handler.execute({
        vendorId: VENDOR_ID,
        actorUserId: OWNER,
        actorRoles: ['VENDOR_OWNER'],
        displayName: 'Branch',
      }),
    ).rejects.toBeInstanceOf(VendorNotFoundForStoreError);
  });

  it('rejects inactive vendor', async () => {
    const handler = new CreateStoreHandler(
      {
        save: vi.fn(),
        existsByVendorAndSlug: vi.fn(),
        findById: vi.fn(),
        findByVendorId: vi.fn(),
        findByStaffUserId: vi.fn(),
        listAll: vi.fn(),
        findActiveBySlug: vi.fn(),
      },
      {
        findById: vi.fn().mockResolvedValue({
          vendorId: VENDOR_ID,
          status: 'pending',
          ownerUserId: OWNER,
          staffUserIds: [OWNER],
        }),
      },
      {
        assignStoreMembership: vi.fn(),
        findByUserId: vi.fn(),
        upsertVendorMembership: vi.fn(),
        removeVendorMembership: vi.fn(),
        revokeStoreMembership: vi.fn(),
      },
      { ensureRoles: vi.fn() },
    );

    await expect(
      handler.execute({
        vendorId: VENDOR_ID,
        actorUserId: OWNER,
        actorRoles: ['VENDOR_OWNER'],
        displayName: 'Branch',
      }),
    ).rejects.toBeInstanceOf(VendorNotActiveForStoreError);
  });

  it('rejects non-staff actors', async () => {
    const handler = new CreateStoreHandler(
      {
        save: vi.fn(),
        existsByVendorAndSlug: vi.fn(),
        findById: vi.fn(),
        findByVendorId: vi.fn(),
        findByStaffUserId: vi.fn(),
        listAll: vi.fn(),
        findActiveBySlug: vi.fn(),
      },
      {
        findById: vi.fn().mockResolvedValue({
          vendorId: VENDOR_ID,
          status: 'active',
          ownerUserId: OWNER,
          staffUserIds: [OWNER],
        }),
      },
      {
        assignStoreMembership: vi.fn(),
        findByUserId: vi.fn(),
        upsertVendorMembership: vi.fn(),
        removeVendorMembership: vi.fn(),
        revokeStoreMembership: vi.fn(),
      },
      { ensureRoles: vi.fn() },
    );

    await expect(
      handler.execute({
        vendorId: VENDOR_ID,
        actorUserId: OTHER,
        actorRoles: ['CUSTOMER'],
        displayName: 'Branch',
      }),
    ).rejects.toBeInstanceOf(StoreAccessDeniedError);
  });

  it('creates a store for an active vendor owner', async () => {
    const save = vi.fn();
    const assignStoreMembership = vi.fn();
    const ensureRoles = vi.fn();
    const handler = new CreateStoreHandler(
      {
        save,
        existsByVendorAndSlug: vi.fn().mockResolvedValue(false),
        findById: vi.fn(),
        findByVendorId: vi.fn(),
        findByStaffUserId: vi.fn(),
        listAll: vi.fn(),
        findActiveBySlug: vi.fn(),
      },
      {
        findById: vi.fn().mockResolvedValue({
          vendorId: VENDOR_ID,
          status: 'active',
          ownerUserId: OWNER,
          staffUserIds: [OWNER],
        }),
      },
      {
        assignStoreMembership,
        findByUserId: vi.fn(),
        upsertVendorMembership: vi.fn(),
        removeVendorMembership: vi.fn(),
        revokeStoreMembership: vi.fn(),
      },
      { ensureRoles },
    );

    const store = await handler.execute({
      vendorId: VENDOR_ID,
      actorUserId: OWNER,
      actorRoles: ['VENDOR_OWNER'],
      displayName: 'Gulshan Branch',
    });

    expect(store.status).toBe('draft');
    expect(store.vendorId).toBe(VENDOR_ID);
    expect(save).toHaveBeenCalledOnce();
    expect(assignStoreMembership).toHaveBeenCalledWith(OWNER, VENDOR_ID, store.id.value);
    expect(ensureRoles).toHaveBeenCalledWith(OWNER, ['STORE_MANAGER']);
  });
});
