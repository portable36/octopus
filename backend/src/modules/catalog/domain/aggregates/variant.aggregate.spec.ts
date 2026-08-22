import { describe, expect, it } from 'vitest';
import { Money } from '../../../../shared-kernel/domain/money.value-object';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { Variant } from './variant.aggregate';

const productId = UniqueID.create();

function createVariant() {
  return Variant.create(productId, {
    name: 'Black / Medium',
    sku: 'abc-def-0001',
    barcode: '000123456789',
    upc: '036000291452',
    mpn: '  MPN-001 ',
    manufacturerReference: ' MANUFACTURER-001 ',
    basePrice: Money.create(12500, 'usd'),
    compareAtPrice: Money.create(15000, 'USD'),
    attributes: [{ code: 'color', value: 'Black' }],
    media: [{ mediaId: 'media-1', mediaType: 'IMAGE', isPrimary: true }],
    externalReferences: [],
  });
}

describe('Variant', () => {
  it('creates a draft with a canonical ID and normalized stable SKU', () => {
    const variant = createVariant();

    expect(variant.id).toBeInstanceOf(UniqueID);
    expect(variant.productId).toBe(productId.value);
    expect(variant.sku).toBe('ABC-DEF-0001');
    expect(variant.status).toBe('DRAFT');
    expect(variant.barcode).toBe('000123456789');
    expect(variant.upc).toBe('036000291452');
    expect(variant.mpn).toBe('MPN-001');
    expect(variant.manufacturerReference).toBe('MANUFACTURER-001');
    expect(variant.currency).toBe('USD');
    expect(variant.getUncommittedEvents()).toHaveLength(1);
    expect(variant.getUncommittedEvents()[0]?.eventName).toBe('ProductVariantCreated');
  });

  it('exposes catalog price metadata without using floating point', () => {
    const variant = createVariant();

    expect(variant.basePrice?.amountMinorUnits).toBe(12500);
    expect(variant.compareAtPrice?.amountMinorUnits).toBe(15000);
    expect(variant.basePrice?.currency).toBe('USD');
  });

  it('activates, archives, and rejects transitions from terminal states', () => {
    const variant = createVariant();

    variant.activate();
    expect(variant.status).toBe('ACTIVE');

    variant.archive();
    expect(variant.status).toBe('ARCHIVED');
    expect(() => variant.activate()).toThrow('Variant cannot transition from ARCHIVED');
  });

  it('changes SKU only before external references exist and emits an event', () => {
    const variant = createVariant();

    variant.changeSku('xyz-uvw-0002');
    expect(variant.sku).toBe('XYZ-UVW-0002');
    expect(variant.getUncommittedEvents().at(-1)?.eventName).toBe('ProductVariantSkuChanged');

    const referencedVariant = Variant.create(productId, {
      name: 'White / Medium',
      sku: 'abc-def-0002',
      externalReferences: [{ system: 'ERP', externalId: 'ERP-1' }],
    });
    expect(() => referencedVariant.changeSku('xyz-uvw-0003')).toThrow(
      'SKU cannot change after external references exist',
    );
  });

  it('rejects invalid barcode checksums', () => {
    expect(() =>
      Variant.create(productId, {
        name: 'Invalid barcode',
        sku: 'abc-def-0004',
        upc: '036000291453',
      }),
    ).toThrow('Invalid UPC checksum');
  });

  it('rejects price metadata with inconsistent currencies', () => {
    expect(() =>
      Variant.create(productId, {
        name: 'Mixed currency',
        sku: 'abc-def-0005',
        basePrice: Money.create(1000, 'USD'),
        compareAtPrice: Money.create(1200, 'EUR'),
      }),
    ).toThrow('Variant price metadata must use one currency');
  });
});
