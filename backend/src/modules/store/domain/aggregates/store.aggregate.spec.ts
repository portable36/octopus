import { describe, expect, it } from 'vitest';
import {
  CannotRemoveLastManagerError,
  InvalidStoreStatusTransitionError,
  StoreClosedError,
} from '../errors/store.errors';
import { Store } from './store.aggregate';

const VENDOR = '01900000-0000-7000-8000-000000000001';
const MANAGER = '01900000-0000-7000-8000-000000000010';
const STAFF = '01900000-0000-7000-8000-000000000011';
const ACTOR = '01900000-0000-7000-8000-000000000099';

describe('Store aggregate', () => {
  it('creates a draft store with manager and StoreCreated', () => {
    const store = Store.create({
      vendorId: VENDOR,
      displayName: 'Gulshan Branch',
      managerUserId: MANAGER,
    });

    expect(store.status).toBe('draft');
    expect(store.vendorId).toBe(VENDOR);
    expect(store.profile.slug).toBe('gulshan-branch');
    expect(store.storeCode.length).toBeGreaterThanOrEqual(3);
    expect(store.isManager(MANAGER)).toBe(true);
    expect(store.getUncommittedEvents().map((event) => event.eventName)).toContain('StoreCreated');
  });

  it('walks draft -> provisioning -> active', () => {
    const store = Store.create({
      vendorId: VENDOR,
      displayName: 'Dhanmondi',
      managerUserId: MANAGER,
    });

    store.startProvisioning(ACTOR);
    expect(store.status).toBe('provisioning');
    store.completeProvisioning(ACTOR);
    expect(store.status).toBe('active');
  });

  it('walks provisioning -> failed -> resume -> active', () => {
    const store = Store.create({
      vendorId: VENDOR,
      displayName: 'Mirpur',
      managerUserId: MANAGER,
    });
    store.startProvisioning(ACTOR);
    store.markProvisioningFailed(ACTOR, 'warehouse error');
    expect(store.status).toBe('failed');
    store.resumeProvisioning(ACTOR);
    expect(store.status).toBe('provisioning');
    store.completeProvisioning(ACTOR);
    expect(store.status).toBe('active');
  });

  it('walks active -> suspended -> active -> archived', () => {
    const store = Store.create({
      vendorId: VENDOR,
      displayName: 'Banani',
      managerUserId: MANAGER,
    });
    store.activate(ACTOR);
    store.suspend(ACTOR, 'maintenance');
    expect(store.status).toBe('suspended');
    store.activate(ACTOR);
    store.enableMaintenance(ACTOR);
    expect(store.status).toBe('maintenance');
    store.activate(ACTOR);
    store.archive(ACTOR);
    expect(store.status).toBe('archived');
  });

  it('activates directly from draft without provisioning', () => {
    const store = Store.create({
      vendorId: VENDOR,
      displayName: 'Quick Open',
      managerUserId: MANAGER,
    });
    store.activate(ACTOR);
    expect(store.status).toBe('active');
  });

  it('rejects invalid transitions', () => {
    const store = Store.create({
      vendorId: VENDOR,
      displayName: 'Banani',
      managerUserId: MANAGER,
    });
    expect(() => store.suspend(ACTOR)).toThrow(InvalidStoreStatusTransitionError);
  });

  it('manages staff with last-manager protection', () => {
    const store = Store.create({
      vendorId: VENDOR,
      displayName: 'Uttara',
      managerUserId: MANAGER,
    });
    store.addStaff(STAFF, 'STORE_STAFF');
    expect(store.hasStaff(STAFF)).toBe(true);
    store.removeStaff(STAFF);
    expect(store.hasStaff(STAFF)).toBe(false);
    expect(() => store.removeStaff(MANAGER)).toThrow(CannotRemoveLastManagerError);
  });

  it('blocks mutations after archive', () => {
    const store = Store.create({
      vendorId: VENDOR,
      displayName: 'Motijheel',
      managerUserId: MANAGER,
    });
    store.activate(ACTOR);
    store.archive(ACTOR);
    expect(() => store.updateProfile({ description: 'x' })).toThrow(StoreClosedError);
  });
});
