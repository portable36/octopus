import { describe, expect, it, vi } from 'vitest';
import { CreateProductHandler, ProductLifecycleHandler } from './product.handlers';
import { CatalogAccessDeniedError, VendorNotActiveForCatalogError } from '../errors/catalog.errors';
import { CatalogAuthorizationService } from '../services/catalog-authorization.service';
import { CatalogMediaGuardService } from '../services/catalog-media-guard.service';
import { Product } from '../../domain/aggregates/product.aggregate';
import type { VendorAccessPort } from '../../../../shared-kernel/application/ports/vendor-access.port';

function vendorAccessMock(findById: VendorAccessPort['findById']): VendorAccessPort {
  return {
    findById,
    findActivePublicById: vi.fn().mockResolvedValue(null),
    findActivePublicBySlug: vi.fn().mockResolvedValue(null),
  };
}

const VENDOR = '01900000-0000-7000-8000-000000000001';
const OWNER = '01900000-0000-7000-8000-000000000010';
const OTHER = '01900000-0000-7000-8000-000000000011';

describe('CreateProductHandler', () => {
  it('creates a product for an active vendor staff member', async () => {
    const save = vi.fn();
    const authz = new CatalogAuthorizationService(
      vendorAccessMock(
        vi.fn().mockResolvedValue({
          vendorId: VENDOR,
          status: 'active',
          ownerUserId: OWNER,
          staffUserIds: [OWNER],
        }),
      ),
    );
    const handler = new CreateProductHandler(
      {
        save,
        findById: vi.fn(),
        findByVendorId: vi.fn(),
        existsByVendorAndSku: vi.fn().mockResolvedValue(false),
        findPublishedById: vi.fn(),
        listPublishedSitemapEntries: vi.fn(),
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
        listPublishedSitemapEntries: vi.fn(),
      },
      new CatalogAuthorizationService(
        vendorAccessMock(
          vi.fn().mockResolvedValue({
            vendorId: VENDOR,
            status: 'pending',
            ownerUserId: OWNER,
            staffUserIds: [OWNER],
          }),
        ),
      ),
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
        listPublishedSitemapEntries: vi.fn(),
      },
      new CatalogAuthorizationService(
        vendorAccessMock(
          vi.fn().mockResolvedValue({
            vendorId: VENDOR,
            status: 'active',
            ownerUserId: OWNER,
            staffUserIds: [OWNER],
          }),
        ),
      ),
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

describe('ProductLifecycleHandler.update', () => {
  const product = Product.create({
    vendorId: VENDOR,
    sku: 'abc-def-1234',
    name: 'Wireless Mouse',
    description: 'Ergonomic',
  });

  it('updates product fields after media ownership check', async () => {
    const save = vi.fn();
    const mediaGuard = {
      assertVendorOwnsMedia: vi.fn().mockResolvedValue(undefined),
    };
    const handler = new ProductLifecycleHandler(
      {
        save,
        findById: vi.fn().mockResolvedValue(product),
        findByVendorId: vi.fn(),
        existsByVendorAndSku: vi.fn(),
        findPublishedById: vi.fn(),
        listPublishedSitemapEntries: vi.fn(),
      },
      new CatalogAuthorizationService(
        vendorAccessMock(
          vi.fn().mockResolvedValue({
            vendorId: VENDOR,
            status: 'active',
            ownerUserId: OWNER,
            staffUserIds: [OWNER],
          }),
        ),
      ),
      mediaGuard as unknown as CatalogMediaGuardService,
      null,
    );

    const updated = await handler.update(product.id.value, OWNER, ['VENDOR_OWNER'], {
      name: 'Ergonomic Mouse',
      media: [{ mediaId: 'media-1', mediaType: 'IMAGE', isPrimary: true, sortOrder: 0 }],
    });

    expect(updated.name).toBe('Ergonomic Mouse');
    expect(mediaGuard.assertVendorOwnsMedia).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledOnce();
  });
});
