import { describe, expect, it, vi } from 'vitest';
import { PricingQuoteHandler } from './pricing.handlers';
import type { PromotionRepository } from '../ports/promotion-repository.interface';
import { Promotion } from '../../domain/aggregates/promotion.aggregate';
import { CouponNotFoundError } from '../../domain/errors/pricing.errors';

function makePromo(): Promotion {
  const promo = Promotion.create({
    vendorId: 'vendor-1',
    storeId: 'store-1',
    name: 'Save',
    couponCode: 'SAVE10',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    currencyCode: 'BDT',
    scope: 'ALL',
    startsAt: new Date('2026-01-01T00:00:00.000Z'),
    usageLimit: 2,
  });
  promo.activate();
  return promo;
}

describe('PricingQuoteHandler', () => {
  it('quotes with coupon and rejects unknown codes', async () => {
    const promo = makePromo();
    const repo: PromotionRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findByCouponCode: vi.fn(async (_vendorId, code) => (code === 'SAVE10' ? promo : null)),
      listByStore: vi.fn(),
      countCustomerUsage: vi.fn(async () => 0),
      recordUsage: vi.fn(),
    };
    const handler = new PricingQuoteHandler(repo);

    const quote = await handler.quote({
      vendorId: 'vendor-1',
      storeId: 'store-1',
      currencyCode: 'BDT',
      couponCode: 'save10',
      lines: [
        {
          lineId: '1',
          variantId: 'v1',
          productId: 'p1',
          categoryIds: [],
          quantity: 1,
          unitBasePriceMinor: 1000,
        },
      ],
      at: new Date('2026-03-01T00:00:00.000Z'),
    });
    expect(quote.discountMinor).toBe(100);
    expect(quote.appliedCouponCode).toBe('SAVE10');

    await expect(
      handler.quote({
        vendorId: 'vendor-1',
        storeId: 'store-1',
        currencyCode: 'BDT',
        couponCode: 'NOPE',
        lines: [
          {
            lineId: '1',
            variantId: 'v1',
            productId: 'p1',
            categoryIds: [],
            quantity: 1,
            unitBasePriceMinor: 1000,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(CouponNotFoundError);
  });
});
