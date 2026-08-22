import { describe, expect, it } from 'vitest';
import {
  CannotRemoveLastOwnerError,
  InvalidVendorStatusTransitionError,
} from '../errors/vendor.errors';
import { Vendor } from './vendor.aggregate';

const OWNER = '01900000-0000-7000-8000-000000000010';
const STAFF = '01900000-0000-7000-8000-000000000011';
const ADMIN = '01900000-0000-7000-8000-000000000099';

describe('Vendor aggregate', () => {
  it('registers a pending vendor with owner staff and VendorCreated', () => {
    const vendor = Vendor.register({
      displayName: 'Dhaka Fresh',
      legalName: 'Dhaka Fresh Ltd',
      contactEmail: 'ops@example.com',
      ownerUserId: OWNER,
    });

    expect(vendor.status).toBe('pending');
    expect(vendor.profile.slug).toBe('dhaka-fresh');
    expect(vendor.isOwner(OWNER)).toBe(true);
    expect(vendor.getUncommittedEvents().map((event) => event.eventName)).toContain(
      'VendorCreated',
    );
  });

  it('walks the onboarding lifecycle', () => {
    const vendor = Vendor.register({
      displayName: 'Shop One',
      legalName: 'Shop One Ltd',
      contactEmail: 'a@b.co',
      ownerUserId: OWNER,
    });

    vendor.submitForReview();
    expect(vendor.status).toBe('under_review');
    vendor.approve(ADMIN);
    expect(vendor.status).toBe('approved');
    vendor.activate();
    expect(vendor.status).toBe('active');
    vendor.suspend(ADMIN, 'policy');
    expect(vendor.status).toBe('suspended');
    vendor.activate();
    expect(vendor.status).toBe('active');
  });

  it('rejects invalid transitions', () => {
    const vendor = Vendor.register({
      displayName: 'Shop Two',
      legalName: 'Shop Two Ltd',
      contactEmail: 'a@b.co',
      ownerUserId: OWNER,
    });
    expect(() => vendor.activate()).toThrow(InvalidVendorStatusTransitionError);
  });

  it('supports reject and reopen', () => {
    const vendor = Vendor.register({
      displayName: 'Shop Three',
      legalName: 'Shop Three Ltd',
      contactEmail: 'a@b.co',
      ownerUserId: OWNER,
    });
    vendor.submitForReview();
    vendor.reject(ADMIN, 'Incomplete paperwork');
    expect(vendor.status).toBe('rejected');
    vendor.reopenAfterRejection();
    expect(vendor.status).toBe('pending');
  });

  it('manages staff with last-owner protection', () => {
    const vendor = Vendor.register({
      displayName: 'Shop Four',
      legalName: 'Shop Four Ltd',
      contactEmail: 'a@b.co',
      ownerUserId: OWNER,
    });
    vendor.addStaff(STAFF, 'VENDOR_STAFF');
    expect(vendor.hasStaff(STAFF)).toBe(true);
    vendor.removeStaff(STAFF);
    expect(vendor.hasStaff(STAFF)).toBe(false);
    expect(() => vendor.removeStaff(OWNER)).toThrow(CannotRemoveLastOwnerError);
  });

  it('blocks commercial operations when not active', () => {
    const vendor = Vendor.register({
      displayName: 'Shop Five',
      legalName: 'Shop Five Ltd',
      contactEmail: 'a@b.co',
      ownerUserId: OWNER,
    });
    expect(() => vendor.assertOperable()).toThrow();
  });
});
