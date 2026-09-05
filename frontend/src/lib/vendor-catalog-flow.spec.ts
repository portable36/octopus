import { describe, expect, it } from 'vitest';
import { createDraftSku, getDefaultVariant } from './vendor-catalog-flow';

describe('createDraftSku', () => {
  it('matches catalog SKU format ABC-DEF-1234', () => {
    const sku = createDraftSku();
    expect(sku).toMatch(/^[A-Z]{3}-[A-Z]{3}-\d{4}$/);
    expect(sku.startsWith('DRF-NEW-')).toBe(true);
  });
});

describe('getDefaultVariant', () => {
  it('returns default variant with barcode and physical attributes intact', () => {
    const variants = [
      {
        id: 'var-1',
        productId: 'prod-1',
        sku: 'ABC-DEF-1234',
        name: 'Default',
        status: 'ACTIVE',
        barcode: '8901234567890',
        basePriceMinor: 25000,
        currencyCode: 'BDT',
        weightGrams: 450,
        dimensions: {
          lengthMillimeters: 120,
          widthMillimeters: 80,
          heightMillimeters: 30,
        },
      },
    ];

    const variant = getDefaultVariant(variants);
    expect(variant?.barcode).toBe('8901234567890');
    expect(variant?.weightGrams).toBe(450);
    expect(variant?.dimensions?.lengthMillimeters).toBe(120);
  });
});
