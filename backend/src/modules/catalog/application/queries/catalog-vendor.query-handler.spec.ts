import { describe, expect, it, vi } from 'vitest';
import { ListProductVariantsHandler, ListStoreOffersHandler } from './catalog-vendor.query-handler';
import { Product } from '../../domain/aggregates/product.aggregate';
import { CatalogAuthorizationService } from '../services/catalog-authorization.service';
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
const PRODUCT_ID = '01900000-0000-7000-8000-000000000100';

describe('ListProductVariantsHandler', () => {
  it('lists variants for vendor staff', async () => {
    const product = Product.create({
      vendorId: VENDOR,
      sku: 'abc-def-1234',
      name: 'Sample Product',
    });
    const variants = [{ id: { value: 'var-1' } }];
    const handler = new ListProductVariantsHandler(
      { findById: vi.fn().mockResolvedValue(product) } as never,
      { findByProductId: vi.fn().mockResolvedValue(variants) } as never,
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

    await expect(handler.execute(PRODUCT_ID, OWNER, ['VENDOR_OWNER'])).resolves.toEqual(variants);
  });
});

describe('ListStoreOffersHandler', () => {
  it('lists offers for a store and product', async () => {
    const offers = [{ id: { value: 'offer-1' } }];
    const handler = new ListStoreOffersHandler(
      {
        findByStoreAndProductId: vi.fn().mockResolvedValue(offers),
        findByStoreId: vi.fn(),
      } as never,
      {
        findById: vi.fn().mockResolvedValue({ storeId: 'store-1', vendorId: VENDOR }),
      } as never,
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
      handler.execute({
        storeId: 'store-1',
        productId: PRODUCT_ID,
        actorUserId: OWNER,
        actorRoles: ['VENDOR_OWNER'],
      }),
    ).resolves.toEqual(offers);
  });
});
