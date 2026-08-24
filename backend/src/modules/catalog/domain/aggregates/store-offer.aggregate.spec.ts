import { describe, expect, it } from 'vitest';
import { StoreOffer } from './store-offer.aggregate';

describe('StoreOffer', () => {
  it('creates a draft offer with integer minor price', () => {
    const offer = StoreOffer.create({
      vendorId: 'v1',
      storeId: 's1',
      productId: 'p1',
      variantId: 'var1',
      priceMinor: 19900,
      currencyCode: 'bdt',
    });
    expect(offer.status).toBe('draft');
    expect(offer.currencyCode).toBe('BDT');
    expect(offer.priceMinor).toBe(19900);
  });

  it('activates and suspends', () => {
    const offer = StoreOffer.create({
      vendorId: 'v1',
      storeId: 's1',
      productId: 'p1',
      variantId: 'var1',
      priceMinor: 100,
      currencyCode: 'BDT',
    });
    offer.activate();
    expect(offer.status).toBe('active');
    expect(offer.isAvailable).toBe(true);
    offer.suspend();
    expect(offer.status).toBe('suspended');
    expect(offer.isAvailable).toBe(false);
  });

  it('rejects float prices', () => {
    expect(() =>
      StoreOffer.create({
        vendorId: 'v1',
        storeId: 's1',
        productId: 'p1',
        variantId: 'var1',
        priceMinor: 10.5,
        currencyCode: 'BDT',
      }),
    ).toThrow('non-negative integer');
  });
});
