import { describe, expect, it } from 'vitest';
import { computeVendorBalance, saleAmountFromOrder } from './compute-vendor-balance';

describe('saleAmountFromOrder', () => {
  it('uses subtotal minus discount', () => {
    expect(saleAmountFromOrder({ subtotalMinor: 1000, discountMinor: 100 })).toBe(900);
    expect(saleAmountFromOrder({ subtotalMinor: 100, discountMinor: 200 })).toBe(0);
  });
});

describe('computeVendorBalance', () => {
  it('splits pending vs available by availableAt', () => {
    const asOf = new Date('2026-08-25T12:00:00.000Z');
    const balance = computeVendorBalance(
      [
        {
          direction: 'CREDIT',
          amountMinor: 1000,
          currencyCode: 'BDT',
          availableAt: new Date('2026-08-20T00:00:00.000Z'),
        },
        {
          direction: 'DEBIT',
          amountMinor: 100,
          currencyCode: 'BDT',
          availableAt: new Date('2026-08-20T00:00:00.000Z'),
        },
        {
          direction: 'CREDIT',
          amountMinor: 500,
          currencyCode: 'BDT',
          availableAt: new Date('2026-09-01T00:00:00.000Z'),
        },
      ],
      asOf,
    );
    expect(balance.availableMinor).toBe(900);
    expect(balance.pendingMinor).toBe(500);
  });
});
