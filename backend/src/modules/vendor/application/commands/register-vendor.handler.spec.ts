import { describe, expect, it, vi } from 'vitest';
import { VendorRegistrationDisabledError, VendorAccessDeniedError } from '../errors/vendor.errors';
import { Vendor } from '../../domain/aggregates/vendor.aggregate';
import { RegisterVendorHandler } from './register-vendor.handler';

const USER_ID = '01900000-0000-7000-8000-000000000010';
const ADMIN_ID = '01900000-0000-7000-8000-000000000099';

function command() {
  return {
    actorUserId: USER_ID,
    actorRoles: ['CUSTOMER'],
    displayName: 'Fresh Foods',
    legalName: 'Fresh Foods Ltd',
    contactEmail: 'owner@example.com',
  };
}

function createHandler(enabled: boolean, ownerExists = true) {
  const vendor = Vendor.register({ ...command(), ownerUserId: USER_ID });
  const vendors = {
    save: vi.fn(),
    existsBySlug: vi.fn().mockResolvedValue(false),
  };
  const memberships = { upsertVendorMembership: vi.fn() };
  const roleAssigner = { ensureRoles: vi.fn() };
  const users = { existsById: vi.fn().mockResolvedValue(ownerExists) };
  const policy = { isEnabled: vi.fn().mockResolvedValue(enabled) };
  const audit = { append: vi.fn() };
  const handler = new RegisterVendorHandler(
    vendors as never,
    memberships as never,
    roleAssigner as never,
    users as never,
    policy as never,
    audit as never,
  );
  return { handler, vendor, vendors, memberships, roleAssigner, users, audit };
}

describe('RegisterVendorHandler', () => {
  it('blocks customer applications when public registration is disabled', async () => {
    const { handler, vendors } = createHandler(false);

    await expect(handler.execute(command())).rejects.toBeInstanceOf(
      VendorRegistrationDisabledError,
    );
    expect(vendors.save).not.toHaveBeenCalled();
  });

  it('creates a pending customer application when registration is enabled', async () => {
    const { handler, vendors, memberships, roleAssigner } = createHandler(true);

    const created = await handler.execute(command());

    expect(created.status).toBe('pending');
    expect(vendors.save).toHaveBeenCalledOnce();
    expect(memberships.upsertVendorMembership).toHaveBeenCalledWith(USER_ID, created.id.value, []);
    expect(roleAssigner.ensureRoles).toHaveBeenCalledWith(USER_ID, ['VENDOR_OWNER']);
  });

  it('allows an admin to create a pending vendor for an existing user', async () => {
    const { handler, vendors, memberships, roleAssigner, audit } = createHandler(false);

    const created = await handler.createForPlatformAdmin({
      ...command(),
      actorUserId: ADMIN_ID,
      actorRoles: ['PLATFORM_ADMIN'],
      ownerUserId: USER_ID,
    });

    expect(created.status).toBe('pending');
    expect(vendors.save).toHaveBeenCalledOnce();
    expect(memberships.upsertVendorMembership).toHaveBeenCalledWith(USER_ID, created.id.value, []);
    expect(roleAssigner.ensureRoles).toHaveBeenCalledWith(USER_ID, ['VENDOR_OWNER']);
    expect(audit.append).toHaveBeenCalledOnce();
  });

  it('denies non-admin vendor creation for another user', async () => {
    const { handler } = createHandler(true);

    await expect(
      handler.createForPlatformAdmin({
        ...command(),
        actorRoles: ['CUSTOMER'],
        ownerUserId: USER_ID,
      }),
    ).rejects.toBeInstanceOf(VendorAccessDeniedError);
  });
});
