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
    expect(store.isManager(MANAGER)).toBe(true);
    expect(store.getUncommittedEvents().map((event) => event.eventName)).toContain('StoreCreated');
  });

  it('walks draft -> active -> suspended -> active -> closed', () => {
    const store = Store.create({
      vendorId: VENDOR,
      displayName: 'Dhanmondi',
      managerUserId: MANAGER,
    });

    store.activate(ACTOR);
    expect(store.status).toBe('active');
    store.suspend(ACTOR, 'maintenance');
    expect(store.status).toBe('suspended');
    store.activate(ACTOR);
    expect(store.status).toBe('active');
    store.close(ACTOR);
    expect(store.status).toBe('closed');
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

  it('blocks mutations after close', () => {
    const store = Store.create({
      vendorId: VENDOR,
      displayName: 'Motijheel',
      managerUserId: MANAGER,
    });
    store.activate(ACTOR);
    store.close(ACTOR);
    expect(() => store.updateProfile({ description: 'x' })).toThrow(StoreClosedError);
  });
});
