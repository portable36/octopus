import { describe, expect, it, vi } from 'vitest';
import { StoreOfferLifecycleHandler } from './store-offer.handlers';
import { CatalogAuthorizationService } from '../services/catalog-authorization.service';
import { StoreOffer } from '../../domain/aggregates/store-offer.aggregate';
import { Product } from '../../domain/aggregates/product.aggregate';
import { Variant } from '../../domain/aggregates/variant.aggregate';
import type { VendorAccessPort } from '../../../../shared-kernel/application/ports/vendor-access.port';

const VENDOR_ID = '01900000-0000-7000-8000-000000000001';
const STORE_ID = '01900000-0000-7000-8000-000000000002';
const OWNER_ID = '01900000-0000-7000-8000-000000000010';
const OTHER_USER = '01900000-0000-7000-8000-000000000099';

function createVendorAccessMock(): VendorAccessPort {
  return {
    findById: vi.fn().mockResolvedValue({
      vendorId: VENDOR_ID,
      status: 'active',
      ownerUserId: OWNER_ID,
      staffUserIds: [OWNER_ID],
    }),
    findActivePublicById: vi.fn().mockResolvedValue(null),
    findActivePublicBySlug: vi.fn().mockResolvedValue(null),
  };
}

describe('StoreOfferLifecycleHandler.activate', () => {
  it('activates an offer when product is published and variant is active', async () => {
    const product = Product.create({
      vendorId: VENDOR_ID,
      sku: 'PRD-ABC-1234',
      name: 'Published Product',
    });
    // Create an active variant
    const variant = Variant.create(product.id, {
      name: 'Variant 1',
      sku: 'VAR-ABC-1234',
    });
    variant.activate();
    product.attachVariant(variant.id.value);
    product.submitForReview();
    product.publish();

    const offer = StoreOffer.create({
      vendorId: VENDOR_ID,
      storeId: STORE_ID,
      productId: product.id.value,
      variantId: variant.id.value,
      priceMinor: 1500,
      currencyCode: 'BDT',
    });

    const saveOffer = vi.fn();
    const offers = {
      findById: vi.fn().mockResolvedValue(offer),
      save: saveOffer,
    };
    const products = {
      findById: vi.fn().mockResolvedValue(product),
    };
    const variants = {
      findById: vi.fn().mockResolvedValue(variant),
    };

    const authz = new CatalogAuthorizationService(createVendorAccessMock());
    const handler = new StoreOfferLifecycleHandler(
      offers as never,
      products as never,
      variants as never,
      authz,
    );

    const activated = await handler.activate(offer.id.value, OWNER_ID, ['VENDOR_OWNER']);
    expect(activated.status).toBe('active');
    expect(saveOffer).toHaveBeenCalledOnce();
  });

  it('rejects activation when product is unpublished (in draft)', async () => {
    const product = Product.create({
      vendorId: VENDOR_ID,
      sku: 'PRD-ABC-1234',
      name: 'Draft Product',
    });
    const variant = Variant.create(product.id, {
      name: 'Variant 1',
      sku: 'VAR-ABC-1234',
    });
    variant.activate();

    const offer = StoreOffer.create({
      vendorId: VENDOR_ID,
      storeId: STORE_ID,
      productId: product.id.value,
      variantId: variant.id.value,
      priceMinor: 1500,
      currencyCode: 'BDT',
    });

    const handler = new StoreOfferLifecycleHandler(
      { findById: vi.fn().mockResolvedValue(offer), save: vi.fn() } as never,
      { findById: vi.fn().mockResolvedValue(product) } as never,
      { findById: vi.fn().mockResolvedValue(variant) } as never,
      new CatalogAuthorizationService(createVendorAccessMock()),
    );

    await expect(
      handler.activate(offer.id.value, OWNER_ID, ['VENDOR_OWNER']),
    ).rejects.toMatchObject({
      code: 'OFFER_NOT_SELLABLE',
      message: expect.stringContaining('product must be published'),
    });
  });

  it('rejects activation when variant is in draft status', async () => {
    const product = Product.create({
      vendorId: VENDOR_ID,
      sku: 'PRD-ABC-1234',
      name: 'Published Product',
    });
    const variant = Variant.create(product.id, {
      name: 'Variant 1',
      sku: 'VAR-ABC-1234',
    }); // Draft
    product.attachVariant(variant.id.value);
    product.submitForReview();
    product.publish();

    const offer = StoreOffer.create({
      vendorId: VENDOR_ID,
      storeId: STORE_ID,
      productId: product.id.value,
      variantId: variant.id.value,
      priceMinor: 1500,
      currencyCode: 'BDT',
    });

    const handler = new StoreOfferLifecycleHandler(
      { findById: vi.fn().mockResolvedValue(offer), save: vi.fn() } as never,
      { findById: vi.fn().mockResolvedValue(product) } as never,
      { findById: vi.fn().mockResolvedValue(variant) } as never,
      new CatalogAuthorizationService(createVendorAccessMock()),
    );

    await expect(
      handler.activate(offer.id.value, OWNER_ID, ['VENDOR_OWNER']),
    ).rejects.toMatchObject({
      code: 'OFFER_NOT_SELLABLE',
      message: expect.stringContaining('variant must be active'),
    });
  });

  it('rejects activation when actor does not belong to vendor staff', async () => {
    const offer = StoreOffer.create({
      vendorId: VENDOR_ID,
      storeId: STORE_ID,
      productId: 'prod-id',
      variantId: 'var-id',
      priceMinor: 1500,
      currencyCode: 'BDT',
    });

    const handler = new StoreOfferLifecycleHandler(
      { findById: vi.fn().mockResolvedValue(offer), save: vi.fn() } as never,
      { findById: vi.fn() } as never,
      { findById: vi.fn() } as never,
      new CatalogAuthorizationService(createVendorAccessMock()),
    );

    await expect(handler.activate(offer.id.value, OTHER_USER, ['CUSTOMER'])).rejects.toMatchObject({
      code: 'CATALOG_ACCESS_DENIED',
    });
  });
});
