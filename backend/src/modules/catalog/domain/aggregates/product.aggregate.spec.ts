import { describe, expect, it } from 'vitest';
import { InvalidProductStatusTransitionError } from '../errors/catalog.errors';
import { Product } from './product.aggregate';

const VENDOR = '01900000-0000-7000-8000-000000000001';

describe('Product', () => {
  it('creates a draft product with normalized SKU and trimmed name', () => {
    const product = Product.create({
      vendorId: VENDOR,
      sku: 'abc-def-1234',
      name: '  wireless mouse  ',
    });

    expect(product.sku).toBe('ABC-DEF-1234');
    expect(product.name).toBe('wireless mouse');
    expect(product.status).toBe('draft');
    expect(product.vendorId).toBe(VENDOR);
    expect(product.getUncommittedEvents()).toContainEqual(
      expect.objectContaining({
        eventName: 'ProductCreated',
        payload: expect.objectContaining({
          sku: 'ABC-DEF-1234',
        }),
      }),
    );
  });

  it('walks draft -> pending_review -> published -> unpublished', () => {
    const product = Product.create({
      vendorId: VENDOR,
      sku: 'abc-def-1234',
      name: 'Wireless Mouse',
    });
    product.submitForReview();
    expect(product.status).toBe('pending_review');
    product.publish();
    expect(product.status).toBe('published');
    expect(product.isAvailable).toBe(true);
    product.unpublish();
    expect(product.status).toBe('unpublished');
  });

  it('rejects invalid transitions and archived mutations', () => {
    const product = Product.create({
      vendorId: VENDOR,
      sku: 'abc-def-1234',
      name: 'Wireless Mouse',
    });
    expect(() => product.publish()).toThrow(InvalidProductStatusTransitionError);
    product.archive();
    expect(() => product.rename('Other')).toThrow('Archived products cannot be mutated');
  });

  it('rejects invalid rename names and trims the value', () => {
    const product = Product.create({
      vendorId: VENDOR,
      sku: 'abc-def-1234',
      name: 'Wireless Mouse',
    });

    expect(() => product.rename('  x  ')).toThrow(
      'Product name must contain at least 3 characters.',
    );
    product.rename('  Gaming mouse  ');
    expect(product.name).toBe('Gaming mouse');
  });

  it('markUnavailable unpublishes a published product', () => {
    const product = Product.create({
      vendorId: VENDOR,
      sku: 'abc-def-1234',
      name: 'Wireless Mouse',
    });
    product.submitForReview();
    product.publish();
    product.markUnavailable();
    expect(product.status).toBe('unpublished');
  });
});
