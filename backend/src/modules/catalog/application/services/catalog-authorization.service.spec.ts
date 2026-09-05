import { describe, expect, it, vi } from 'vitest';
import { CatalogAuthorizationService } from './catalog-authorization.service';
import {
  CatalogAccessDeniedError,
  VendorNotActiveForCatalogError,
  VendorNotFoundForCatalogError,
} from '../errors/catalog.errors';
import type {
  VendorAccessPort,
  VendorAccessSnapshot,
} from '../../../../shared-kernel/application/ports/vendor-access.port';

const VENDOR_ID = '01900000-0000-7000-8000-000000000001';
const OWNER_ID = '01900000-0000-7000-8000-000000000010';
const STAFF_ID = '01900000-0000-7000-8000-000000000020';
const STRANGER_ID = '01900000-0000-7000-8000-000000000099';

function createVendorAccessMock(vendorSnapshot: VendorAccessSnapshot | null): VendorAccessPort {
  return {
    findById: vi.fn().mockResolvedValue(vendorSnapshot),
    findActivePublicById: vi.fn().mockResolvedValue(null),
    findActivePublicBySlug: vi.fn().mockResolvedValue(null),
  };
}

describe('CatalogAuthorizationService', () => {
  const activeVendor: VendorAccessSnapshot = {
    vendorId: VENDOR_ID,
    status: 'active',
    ownerUserId: OWNER_ID,
    staffUserIds: [STAFF_ID],
    currencyCode: 'BDT',
    codEnabled: true,
    codMinAmountMinor: 100,
    codMaxAmountMinor: 100000,
    codReservationTtlHours: 24,
  };

  it('requires an active vendor', async () => {
    const service = new CatalogAuthorizationService(createVendorAccessMock(activeVendor));
    const result = await service.requireActiveVendor(VENDOR_ID);
    expect(result.vendorId).toBe(VENDOR_ID);

    const notFoundService = new CatalogAuthorizationService(createVendorAccessMock(null));
    await expect(notFoundService.requireActiveVendor(VENDOR_ID)).rejects.toThrow(
      VendorNotFoundForCatalogError,
    );

    const suspendedService = new CatalogAuthorizationService(
      createVendorAccessMock({ ...activeVendor, status: 'suspended' }),
    );
    await expect(suspendedService.requireActiveVendor(VENDOR_ID)).rejects.toThrow(
      VendorNotActiveForCatalogError,
    );
  });

  it('assertCanMutate allows PLATFORM_ADMIN, owner, and staff', () => {
    const service = new CatalogAuthorizationService(createVendorAccessMock(activeVendor));

    expect(() =>
      service.assertCanMutate(activeVendor, STRANGER_ID, ['PLATFORM_ADMIN']),
    ).not.toThrow();
    expect(() => service.assertCanMutate(activeVendor, OWNER_ID, ['VENDOR_OWNER'])).not.toThrow();
    expect(() => service.assertCanMutate(activeVendor, STAFF_ID, ['VENDOR_STAFF'])).not.toThrow();
  });

  it('assertCanMutate rejects customers and strangers', () => {
    const service = new CatalogAuthorizationService(createVendorAccessMock(activeVendor));

    expect(() => service.assertCanMutate(activeVendor, OWNER_ID, ['CUSTOMER'])).toThrow(
      CatalogAccessDeniedError,
    );
    expect(() => service.assertCanMutate(activeVendor, STRANGER_ID, ['VENDOR_STAFF'])).toThrow(
      CatalogAccessDeniedError,
    );
  });

  it('assertCanRead allows PLATFORM_ADMIN, owner, and staff; rejects customer and strangers', () => {
    const service = new CatalogAuthorizationService(createVendorAccessMock(activeVendor));

    expect(() =>
      service.assertCanRead(activeVendor, STRANGER_ID, ['PLATFORM_ADMIN']),
    ).not.toThrow();
    expect(() => service.assertCanRead(activeVendor, OWNER_ID, ['VENDOR_OWNER'])).not.toThrow();
    expect(() => service.assertCanRead(activeVendor, STAFF_ID, ['VENDOR_STAFF'])).not.toThrow();

    expect(() => service.assertCanRead(activeVendor, OWNER_ID, ['CUSTOMER'])).toThrow(
      CatalogAccessDeniedError,
    );
    expect(() => service.assertCanRead(activeVendor, STRANGER_ID, ['VENDOR_STAFF'])).toThrow(
      CatalogAccessDeniedError,
    );
    expect(() => service.assertCanRead(null, STRANGER_ID, ['VENDOR_STAFF'])).toThrow(
      CatalogAccessDeniedError,
    );
  });
});
