import { describe, expect, it } from 'vitest';
import { Product } from './product.aggregate';

describe('Product', () => {
  it('creates a product with a normalized SKU and trimmed name', () => {
    const product = Product.create('abc-def-1234', '  wireless mouse  ');

    expect(product.sku).toBe('ABC-DEF-1234');
    expect(product.name).toBe('wireless mouse');
    expect(product.isAvailable).toBe(true);
    expect(product.getUncommittedEvents()).toContainEqual(
      expect.objectContaining({
        eventName: 'ProductCreated',
        payload: expect.objectContaining({
          sku: 'ABC-DEF-1234',
        }),
      }),
    );
  });

  it('marks a product unavailable and emits an event', () => {
    const product = Product.create('abc-def-1234', 'Wireless Mouse');

    product.markUnavailable();

    expect(product.isAvailable).toBe(false);
    expect(product.getUncommittedEvents()).toContainEqual(
      expect.objectContaining({
        eventName: 'ProductMarkedUnavailable',
      }),
    );
  });

  it('rejects invalid rename names and trims the value', () => {
    const product = Product.create('abc-def-1234', 'Wireless Mouse');

    expect(() => product.rename('  x  ')).toThrow('Product name must contain at least 3 characters.');
    product.rename('  Gaming mouse  ');
    expect(product.name).toBe('Gaming mouse');
  });
});
