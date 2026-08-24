import { describe, expect, it } from 'vitest';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { Promotion } from '../aggregates/promotion.aggregate';
import { calculatePriceQuote } from './pricing-engine';

function activePromo(overrides: Partial<Parameters<typeof Promotion.create>[0]> = {}): Promotion {
  const promo = Promotion.create({
    vendorId: 'vendor-1',
    storeId: 'store-1',
    name: 'Promo',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    currencyCode: 'BDT',
    scope: 'ALL',
    startsAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });
  promo.activate();
  return promo;
}

describe('calculatePriceQuote', () => {
  const line = {
    lineId: 'l1',
    variantId: 'var-1',
    productId: 'prod-1',
    categoryIds: ['cat-1'] as const,
    quantity: 2,
    unitBasePriceMinor: 500,
  };

  it('uses sale price when lower than base', () => {
    const quote = calculatePriceQuote({
      vendorId: 'vendor-1',
      storeId: 'store-1',
      currencyCode: 'BDT',
      lines: [{ ...line, unitSalePriceMinor: 400 }],
    });
    expect(quote.subtotalMinor).toBe(800);
    expect(quote.lines[0]!.unitBasePriceMinor).toBe(500);
    expect(quote.lines[0]!.unitSalePriceMinor).toBe(400);
    expect(quote.totalMinor).toBe(800);
  });

  it('applies percentage coupon discount, tax, shipping, and commission', () => {
    const promo = activePromo({ couponCode: 'SAVE10', discountValue: 10 });
    const quote = calculatePriceQuote({
      vendorId: 'vendor-1',
      storeId: 'store-1',
      currencyCode: 'BDT',
      lines: [line],
      shippingMinor: 50,
      taxRateBps: 500, // 5%
      commissionRateBps: 1000, // 10%
      promotion: promo,
      at: new Date('2026-03-01T00:00:00.000Z'),
    });

    // subtotal 1000, discount 100, taxable 900, tax 45, shipping 50, total 995
    expect(quote.subtotalMinor).toBe(1000);
    expect(quote.discountMinor).toBe(100);
    expect(quote.taxMinor).toBe(45);
    expect(quote.shippingMinor).toBe(50);
    expect(quote.commissionMinor).toBe(90);
    expect(quote.totalMinor).toBe(995);
    expect(quote.appliedCouponCode).toBe('SAVE10');
    expect(quote.appliedPromotionId).toBe(promo.id.value);
  });

  it('applies fixed discount only to eligible product lines', () => {
    const promo = activePromo({
      discountType: 'FIXED',
      discountValue: 150,
      scope: 'PRODUCT',
      scopeIds: ['prod-1'],
      couponCode: 'FIXED150',
    });
    const quote = calculatePriceQuote({
      vendorId: 'vendor-1',
      storeId: 'store-1',
      currencyCode: 'BDT',
      lines: [
        line,
        {
          lineId: 'l2',
          variantId: 'var-2',
          productId: 'prod-2',
          categoryIds: [],
          quantity: 1,
          unitBasePriceMinor: 300,
        },
      ],
      promotion: promo,
      at: new Date('2026-03-01T00:00:00.000Z'),
    });
    expect(quote.subtotalMinor).toBe(1300);
    expect(quote.discountMinor).toBe(150);
    expect(quote.lines[0]!.lineDiscountMinor).toBe(150);
    expect(quote.lines[1]!.lineDiscountMinor).toBe(0);
  });

  it('rejects currency mismatch between promotion and quote', () => {
    const promo = activePromo({ currencyCode: 'USD', couponCode: 'USDONLY' });
    expect(() =>
      calculatePriceQuote({
        vendorId: 'vendor-1',
        storeId: 'store-1',
        currencyCode: 'BDT',
        lines: [line],
        promotion: promo,
        at: new Date('2026-03-01T00:00:00.000Z'),
      }),
    ).toThrow(/currency/i);
  });

  it('rejects float money inputs', () => {
    expect(() =>
      calculatePriceQuote({
        vendorId: 'vendor-1',
        storeId: 'store-1',
        currencyCode: 'BDT',
        lines: [{ ...line, unitBasePriceMinor: 10.5 }],
      }),
    ).toThrow(/integer/);
  });

  it('allocates discount with exact integer remainder', () => {
    const promo = Promotion.reconstitute(UniqueID.create(), {
      vendorId: 'vendor-1',
      storeId: 'store-1',
      name: 'Odd',
      couponCode: 'ODD',
      discountType: 'FIXED',
      discountValue: 1,
      currencyCode: 'BDT',
      minOrderAmountMinor: 0,
      scope: 'ALL',
      scopeIds: [],
      usageLimit: null,
      usageCount: 0,
      perCustomerLimit: null,
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      endsAt: null,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const quote = calculatePriceQuote({
      vendorId: 'vendor-1',
      storeId: 'store-1',
      currencyCode: 'BDT',
      lines: [
        { ...line, lineId: 'a', quantity: 1, unitBasePriceMinor: 100 },
        { ...line, lineId: 'b', quantity: 1, unitBasePriceMinor: 100 },
        { ...line, lineId: 'c', quantity: 1, unitBasePriceMinor: 100 },
      ],
      promotion: promo,
      at: new Date('2026-03-01T00:00:00.000Z'),
    });
    expect(quote.discountMinor).toBe(1);
    expect(quote.lines.reduce((s, l) => s + l.lineDiscountMinor, 0)).toBe(1);
  });
});
