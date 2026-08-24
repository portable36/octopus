import { describe, expect, it } from 'vitest';
import { Promotion } from './promotion.aggregate';

describe('Promotion', () => {
  const base = {
    vendorId: 'vendor-1',
    storeId: 'store-1',
    name: '10% off',
    discountType: 'PERCENTAGE' as const,
    discountValue: 10,
    currencyCode: 'BDT',
    scope: 'ALL' as const,
    startsAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  it('rejects non-integer discount values', () => {
    expect(() => Promotion.create({ ...base, discountValue: 10.5 })).toThrow(/positive integer/);
  });

  it('rejects percentage over 100', () => {
    expect(() => Promotion.create({ ...base, discountValue: 101 })).toThrow(/exceed 100/);
  });

  it('normalizes coupon codes to uppercase', () => {
    const promo = Promotion.create({ ...base, couponCode: 'save10' });
    expect(promo.couponCode).toBe('SAVE10');
  });

  it('computes percentage discount with integer rounding', () => {
    const promo = Promotion.create(base);
    expect(promo.computeDiscountMinor(1000)).toBe(100);
    expect(promo.computeDiscountMinor(333)).toBe(33);
  });

  it('caps fixed discount at eligible subtotal', () => {
    const promo = Promotion.create({
      ...base,
      discountType: 'FIXED',
      discountValue: 500,
    });
    expect(promo.computeDiscountMinor(200)).toBe(200);
  });

  it('enforces expiration and usage limits', () => {
    const promo = Promotion.create({
      ...base,
      couponCode: 'OLD',
      endsAt: new Date('2026-06-01T00:00:00.000Z'),
      usageLimit: 1,
    });
    promo.activate();

    expect(() =>
      promo.assertApplicable({
        vendorId: 'vendor-1',
        storeId: 'store-1',
        currencyCode: 'BDT',
        subtotalMinor: 1000,
        at: new Date('2026-07-01T00:00:00.000Z'),
      }),
    ).toThrow(/expired/i);

    promo.assertApplicable({
      vendorId: 'vendor-1',
      storeId: 'store-1',
      currencyCode: 'BDT',
      subtotalMinor: 1000,
      at: new Date('2026-05-01T00:00:00.000Z'),
    });
    promo.recordUsage();
    expect(() => promo.recordUsage()).toThrow(/usage limit/i);
  });

  it('enforces vendor and store restrictions', () => {
    const storePromo = Promotion.create({
      ...base,
      scope: 'STORE',
      couponCode: 'STOREONLY',
    });
    storePromo.activate();

    expect(() =>
      storePromo.assertApplicable({
        vendorId: 'vendor-1',
        storeId: 'other-store',
        currencyCode: 'BDT',
        subtotalMinor: 1000,
        at: new Date('2026-02-01T00:00:00.000Z'),
      }),
    ).toThrow(/store/i);

    expect(() =>
      storePromo.assertApplicable({
        vendorId: 'other-vendor',
        storeId: 'store-1',
        currencyCode: 'BDT',
        subtotalMinor: 1000,
        at: new Date('2026-02-01T00:00:00.000Z'),
      }),
    ).toThrow(/vendor/i);
  });

  it('matches product and category scope', () => {
    const productPromo = Promotion.create({
      ...base,
      scope: 'PRODUCT',
      scopeIds: ['prod-a'],
    });
    expect(
      productPromo.isLineEligible({
        lineId: '1',
        variantId: 'v1',
        productId: 'prod-a',
        categoryIds: [],
        quantity: 1,
        unitBasePriceMinor: 100,
      }),
    ).toBe(true);
    expect(
      productPromo.isLineEligible({
        lineId: '2',
        variantId: 'v2',
        productId: 'prod-b',
        categoryIds: [],
        quantity: 1,
        unitBasePriceMinor: 100,
      }),
    ).toBe(false);

    const categoryPromo = Promotion.create({
      ...base,
      scope: 'CATEGORY',
      scopeIds: ['cat-1'],
    });
    expect(
      categoryPromo.isLineEligible({
        lineId: '3',
        variantId: 'v3',
        productId: 'prod-c',
        categoryIds: ['cat-2', 'cat-1'],
        quantity: 1,
        unitBasePriceMinor: 100,
      }),
    ).toBe(true);
  });
});
