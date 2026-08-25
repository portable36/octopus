import { describe, expect, it } from 'vitest';
import { buildOfferSearchDocument, resolveStockStatus } from './build-offer-search-document';

describe('resolveStockStatus', () => {
  it('maps availability', () => {
    expect(resolveStockStatus(3)).toBe('IN_STOCK');
    expect(resolveStockStatus(0)).toBe('OUT_OF_STOCK');
    expect(resolveStockStatus(null)).toBe('UNKNOWN');
  });
});

describe('buildOfferSearchDocument', () => {
  it('marks unpublished or inactive offers as not searchable', () => {
    const doc = buildOfferSearchDocument({
      offerId: '11111111-1111-7111-8111-111111111111',
      productId: '22222222-2222-7222-8222-222222222222',
      variantId: '33333333-3333-7333-8333-333333333333',
      vendorId: '44444444-4444-7444-8444-444444444444',
      storeId: '55555555-5555-7555-8555-555555555555',
      name: 'Oversized Tee',
      slug: 'oversized-tee',
      sku: 'TEE-1',
      priceMinor: 120000,
      currencyCode: 'bdt',
      offerStatus: 'active',
      offerAvailable: true,
      productStatus: 'unpublished',
      stockAvailable: 5,
      updatedAt: new Date('2026-08-25T00:00:00.000Z'),
      version: 2,
    });
    expect(doc.searchable).toBe(false);
    expect(doc.id).toBe(doc.offerId);
    expect(doc.currencyCode).toBe('BDT');
    expect(doc.stockStatus).toBe('IN_STOCK');
  });

  it('marks active published offers searchable', () => {
    const doc = buildOfferSearchDocument({
      offerId: '11111111-1111-7111-8111-111111111111',
      productId: '22222222-2222-7222-8222-222222222222',
      variantId: '33333333-3333-7333-8333-333333333333',
      vendorId: '44444444-4444-7444-8444-444444444444',
      storeId: '55555555-5555-7555-8555-555555555555',
      name: 'Oversized Tee',
      slug: 'oversized-tee',
      sku: 'TEE-1',
      shortDescription: 'Soft cotton',
      brandId: null,
      categoryIds: ['66666666-6666-7666-8666-666666666666'],
      priceMinor: 120000,
      currencyCode: 'BDT',
      offerStatus: 'active',
      offerAvailable: true,
      productStatus: 'published',
      stockAvailable: 0,
      updatedAt: new Date('2026-08-25T00:00:00.000Z'),
      version: 1,
    });
    expect(doc.searchable).toBe(true);
    expect(doc.stockStatus).toBe('OUT_OF_STOCK');
  });
});
