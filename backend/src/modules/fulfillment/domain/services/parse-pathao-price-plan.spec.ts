import { describe, expect, it } from 'vitest';
import { parsePathaoPricePlan } from './parse-pathao-price-plan';

describe('parsePathaoPricePlan', () => {
  it('converts major BDT units to integer minor units', () => {
    expect(
      parsePathaoPricePlan({
        price: 80,
        discount: 5.5,
        final_price: 74.5,
      }),
    ).toEqual({
      priceMinor: 8000,
      discountMinor: 550,
      finalPriceMinor: 7450,
      currencyCode: 'BDT',
    });
  });

  it('derives final from price − discount when final_price missing', () => {
    expect(parsePathaoPricePlan({ price: 100, discount: 10 })).toEqual({
      priceMinor: 10000,
      discountMinor: 1000,
      finalPriceMinor: 9000,
      currencyCode: 'BDT',
    });
  });
});
