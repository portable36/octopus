import { describe, expect, it } from 'vitest';
import { InsufficientStockError } from '../errors/inventory.errors';
import { InventoryItem } from './inventory-item.aggregate';

/**
 * Models the serialized outcome of two concurrent reserve attempts against the
 * same locked inventory row (FOR UPDATE): only one can succeed when stock is short.
 */
describe('concurrent reservation semantics', () => {
  it('allows only one of two competing reserves when available is insufficient for both', () => {
    const item = InventoryItem.create({
      vendorId: '00000000-0000-7000-8000-000000000001',
      storeId: '00000000-0000-7000-8000-000000000002',
      warehouseId: '00000000-0000-7000-8000-000000000003',
      variantId: '00000000-0000-7000-8000-000000000004',
    });
    item.receive(5);

    const attemptA = () => item.reserve(4);
    const attemptB = () => item.reserve(3);

    attemptA();
    expect(item.available).toBe(1);
    expect(attemptB).toThrow(InsufficientStockError);
    expect(item.reserved).toBe(4);
  });
});
