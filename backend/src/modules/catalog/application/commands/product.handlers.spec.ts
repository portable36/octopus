import { describe, expect, it, vi } from 'vitest';
import { CreateProductHandler } from './product.handlers';
import { CatalogAccessDeniedError, VendorNotActiveForCatalogError } from '../errors/catalog.errors';
import { CatalogAuthorizationService } from '../services/catalog-authorization.service';

const VENDOR = '01900000-0000-7000-8000-000000000001';
const OWNER = '01900000-0000-7000-8000-000000000010';
const OTHER = '01900000-0000-7000-8000-000000000011';

describe('CreateProductHandler', () => {
  it('creates a product for an active vendor staff member', async () => {
    const save = vi.fn();
    const authz = new CatalogAuthorizationService({
      findById: vi.fn().mockResolvedValue({
        vendorId: VENDOR,
        status: 'active',
        ownerUserId: OWNER,
        staffUserIds: [OWNER],
      }),
    });
    const handler = new CreateProductHandler(
      {
        save,
        findById: vi.fn(),
        findByVendorId: vi.fn(),
        existsByVendorAndSku: vi.fn().mockResolvedValue(false),
        findPublishedById: vi.fn(),
      },
      authz,
    );

    const product = await handler.execute({
      vendorId: VENDOR,
      actorUserId: OWNER,
      actorRoles: ['VENDOR_OWNER'],
      sku: 'abc-def-1234',
      name: 'Wireless Mouse',
    });

    expect(product.status).toBe('draft');
    expect(save).toHaveBeenCalledOnce();
  });

  it('rejects inactive vendors and outsiders', async () => {
    const inactive = new CreateProductHandler(
      {
        save: vi.fn(),
        findById: vi.fn(),
        findByVendorId: vi.fn(),
        existsByVendorAndSku: vi.fn(),
        findPublishedById: vi.fn(),
      },
      new CatalogAuthorizationService({
        findById: vi.fn().mockResolvedValue({
          vendorId: VENDOR,
          status: 'pending',
          ownerUserId: OWNER,
          staffUserIds: [OWNER],
        }),
      }),
    );
    await expect(
      inactive.execute({
        vendorId: VENDOR,
        actorUserId: OWNER,
        actorRoles: ['VENDOR_OWNER'],
        sku: 'abc-def-1234',
        name: 'Wireless Mouse',
      }),
    ).rejects.toBeInstanceOf(VendorNotActiveForCatalogError);

    const denied = new CreateProductHandler(
      {
        save: vi.fn(),
        findById: vi.fn(),
        findByVendorId: vi.fn(),
        existsByVendorAndSku: vi.fn(),
        findPublishedById: vi.fn(),
      },
      new CatalogAuthorizationService({
        findById: vi.fn().mockResolvedValue({
          vendorId: VENDOR,
          status: 'active',
          ownerUserId: OWNER,
          staffUserIds: [OWNER],
        }),
      }),
    );
    await expect(
      denied.execute({
        vendorId: VENDOR,
        actorUserId: OTHER,
        actorRoles: ['CUSTOMER'],
        sku: 'abc-def-1234',
        name: 'Wireless Mouse',
      }),
    ).rejects.toBeInstanceOf(CatalogAccessDeniedError);
  });
});
