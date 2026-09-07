import { describe, expect, it } from 'vitest';
import { Promotion } from '../aggregates/promotion.aggregate';
import { DiscountMatrix } from './discount-matrix';
import type { QuoteLineInput } from '../pricing.types';

describe('DiscountMatrix', () => {
  const vendorId = 'vendor-uuid-001';
  const storeId = 'store-uuid-001';
  const currencyCode = 'BDT';
  const now = new Date('2026-09-07T12:00:00.000Z');

  const line1: QuoteLineInput = {
    lineId: 'line-1',
    variantId: 'var-1',
    productId: 'prod-shoes',
    categoryIds: ['cat-footwear'],
    quantity: 2,
    unitBasePriceMinor: 100_000, // 1000 BDT
  };

  const line2: QuoteLineInput = {
    lineId: 'line-2',
    variantId: 'var-2',
    productId: 'prod-socks',
    categoryIds: ['cat-accessories'],
    quantity: 1,
    unitBasePriceMinor: 50_000, // 500 BDT
  };

  const inputLines = [
    { line: line1, lineSubtotal: 200_000 },
    { line: line2, lineSubtotal: 50_000 },
  ];
  const subtotalMinor = 250_000; // 2500 BDT

  it('returns zero discount when no promotions are provided', () => {
    const result = DiscountMatrix.evaluate({
      vendorId,
      storeId,
      currencyCode,
      lines: inputLines,
      subtotalMinor,
      at: now,
    });

    expect(result.discountMinor).toBe(0);
    expect(result.winningPromotion).toBeNull();
    expect(result.appliedPromotionId).toBeNull();
    expect(result.appliedCouponCode).toBeNull();
  });

  it('selects an active automatic store promotion when cart qualifies', () => {
    const storePromo = Promotion.create({
      vendorId,
      storeId,
      name: 'Storewide 10% Off',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      currencyCode,
      scope: 'STORE',
      startsAt: new Date('2026-09-01T00:00:00.000Z'),
    });
    storePromo.activate();

    const result = DiscountMatrix.evaluate({
      vendorId,
      storeId,
      currencyCode,
      lines: inputLines,
      subtotalMinor,
      automaticPromotions: [storePromo],
      at: now,
    });

    // 10% of 250,000 = 25,000
    expect(result.discountMinor).toBe(25_000);
    expect(result.winningPromotion?.id.value).toBe(storePromo.id.value);
    expect(result.appliedPromotionName).toBe('Storewide 10% Off');
    expect(result.appliedCouponCode).toBeNull();
  });

  it('picks the promotion yielding the highest discount among multiple automatic rules', () => {
    // Promo 1: 10% off store-wide -> 25,000 discount
    const promo10Pct = Promotion.create({
      vendorId,
      storeId,
      name: '10% Store Discount',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      currencyCode,
      scope: 'STORE',
      startsAt: new Date('2026-09-01T00:00:00.000Z'),
    });
    promo10Pct.activate();

    // Promo 2: Fixed 300 BDT (30,000 minor units) off for orders over 2000 BDT -> 30,000 discount
    const promoFixed300 = Promotion.create({
      vendorId,
      storeId,
      name: 'Fixed 300 BDT Off',
      discountType: 'FIXED',
      discountValue: 30_000,
      currencyCode,
      scope: 'STORE',
      minOrderAmountMinor: 200_000,
      startsAt: new Date('2026-09-01T00:00:00.000Z'),
    });
    promoFixed300.activate();

    const result = DiscountMatrix.evaluate({
      vendorId,
      storeId,
      currencyCode,
      lines: inputLines,
      subtotalMinor,
      automaticPromotions: [promo10Pct, promoFixed300],
      at: now,
    });

    expect(result.discountMinor).toBe(30_000);
    expect(result.winningPromotion?.id.value).toBe(promoFixed300.id.value);
    expect(result.appliedPromotionName).toBe('Fixed 300 BDT Off');
  });

  it('breaks ties in discount amount by scope specificity (Product > Category > Store > Vendor > All)', () => {
    // Product-scoped fixed 200 BDT off shoes
    const productPromo = Promotion.create({
      vendorId,
      storeId,
      name: 'Shoes 200 BDT Off',
      discountType: 'FIXED',
      discountValue: 20_000,
      currencyCode,
      scope: 'PRODUCT',
      scopeIds: ['prod-shoes'],
      startsAt: new Date('2026-09-01T00:00:00.000Z'),
    });
    productPromo.activate();

    // Store-scoped fixed 200 BDT off
    const storePromo = Promotion.create({
      vendorId,
      storeId,
      name: 'Store 200 BDT Off',
      discountType: 'FIXED',
      discountValue: 20_000,
      currencyCode,
      scope: 'STORE',
      startsAt: new Date('2026-09-01T00:00:00.000Z'),
    });
    storePromo.activate();

    const result = DiscountMatrix.evaluate({
      vendorId,
      storeId,
      currencyCode,
      lines: inputLines,
      subtotalMinor,
      automaticPromotions: [storePromo, productPromo],
      at: now,
    });

    // Both give 20,000, but PRODUCT scope has higher specificity than STORE
    expect(result.discountMinor).toBe(20_000);
    expect(result.winningPromotion?.id.value).toBe(productPromo.id.value);
    expect(result.appliedPromotionName).toBe('Shoes 200 BDT Off');
  });

  it('rejects promotions when minimum order amount is not met', () => {
    const minOrderPromo = Promotion.create({
      vendorId,
      storeId,
      name: 'Big Order 20% Off',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      currencyCode,
      scope: 'STORE',
      minOrderAmountMinor: 500_000, // 5000 BDT required, cart is only 2500 BDT
      startsAt: new Date('2026-09-01T00:00:00.000Z'),
    });
    minOrderPromo.activate();

    const result = DiscountMatrix.evaluate({
      vendorId,
      storeId,
      currencyCode,
      lines: inputLines,
      subtotalMinor,
      automaticPromotions: [minOrderPromo],
      at: now,
    });

    expect(result.discountMinor).toBe(0);
    expect(result.candidates[0]?.isApplicable).toBe(false);
    expect(result.candidates[0]?.ineligibilityReason).toContain('Minimum order amount');
  });

  it('rejects promotions when customer usage limit is reached', () => {
    const limitedPromo = Promotion.create({
      vendorId,
      storeId,
      name: 'Once per customer 10%',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      currencyCode,
      scope: 'STORE',
      perCustomerLimit: 1,
      startsAt: new Date('2026-09-01T00:00:00.000Z'),
    });
    limitedPromo.activate();

    const result = DiscountMatrix.evaluate({
      vendorId,
      storeId,
      currencyCode,
      lines: inputLines,
      subtotalMinor,
      automaticPromotions: [limitedPromo],
      customerUsageCounts: { [limitedPromo.id.value]: 1 }, // Already used once
      at: now,
    });

    expect(result.discountMinor).toBe(0);
    expect(result.candidates[0]?.isApplicable).toBe(false);
    expect(result.candidates[0]?.ineligibilityReason).toBe('Per-customer limit reached');
  });

  it('prioritizes explicit coupon promotion over automatic promotions under COUPON_PRIORITY strategy', () => {
    const couponPromo = Promotion.create({
      vendorId,
      storeId,
      name: 'VIP Coupon 15%',
      couponCode: 'VIP15',
      discountType: 'PERCENTAGE',
      discountValue: 15,
      currencyCode,
      scope: 'STORE',
      startsAt: new Date('2026-09-01T00:00:00.000Z'),
    });
    couponPromo.activate();

    const autoPromo = Promotion.create({
      vendorId,
      storeId,
      name: 'Store 10% Auto',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      currencyCode,
      scope: 'STORE',
      startsAt: new Date('2026-09-01T00:00:00.000Z'),
    });
    autoPromo.activate();

    const result = DiscountMatrix.evaluate({
      vendorId,
      storeId,
      currencyCode,
      lines: inputLines,
      subtotalMinor,
      couponPromotion: couponPromo,
      automaticPromotions: [autoPromo],
      strategy: 'COUPON_PRIORITY',
      at: now,
    });

    // 15% of 250,000 = 37,500
    expect(result.discountMinor).toBe(37_500);
    expect(result.appliedCouponCode).toBe('VIP15');
    expect(result.winningPromotion?.id.value).toBe(couponPromo.id.value);
  });

  it('selects highest discount under BEST_DISCOUNT strategy even when coupon gives less', () => {
    const smallCoupon = Promotion.create({
      vendorId,
      storeId,
      name: 'Small 5% Coupon',
      couponCode: 'SAVE5',
      discountType: 'PERCENTAGE',
      discountValue: 5,
      currencyCode,
      scope: 'STORE',
      startsAt: new Date('2026-09-01T00:00:00.000Z'),
    });
    smallCoupon.activate();

    const bigAutoPromo = Promotion.create({
      vendorId,
      storeId,
      name: 'Mega Store 20%',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      currencyCode,
      scope: 'STORE',
      startsAt: new Date('2026-09-01T00:00:00.000Z'),
    });
    bigAutoPromo.activate();

    const result = DiscountMatrix.evaluate({
      vendorId,
      storeId,
      currencyCode,
      lines: inputLines,
      subtotalMinor,
      couponPromotion: smallCoupon,
      automaticPromotions: [bigAutoPromo],
      strategy: 'BEST_DISCOUNT',
      at: now,
    });

    // 20% of 250,000 = 50,000 beats 5% (12,500)
    expect(result.discountMinor).toBe(50_000);
    expect(result.winningPromotion?.id.value).toBe(bigAutoPromo.id.value);
    expect(result.appliedCouponCode).toBeNull();
  });
});
