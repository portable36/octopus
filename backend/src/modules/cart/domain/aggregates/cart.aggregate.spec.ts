import { describe, expect, it } from 'vitest';
import { Cart } from './cart.aggregate';
import {
  CartCurrencyMismatchError,
  CartVendorIsolationError,
  InvalidCartQuantityError,
} from '../errors/cart.errors';

describe('Cart', () => {
  const baseLine = {
    vendorId: 'vendor-a',
    storeId: 'store-a',
    productId: 'prod-1',
    variantId: 'var-1',
    offerId: 'offer-1',
    quantity: 1,
    unitPriceSnapshotMinor: 500,
    currencyCode: 'BDT',
  };

  it('supports multi-vendor lines with quantity bounds', () => {
    const cart = Cart.create({ customerId: 'customer-1' });
    cart.addItem(baseLine);
    cart.addItem({
      ...baseLine,
      vendorId: 'vendor-b',
      storeId: 'store-b',
      productId: 'prod-2',
      variantId: 'var-2',
      offerId: 'offer-2',
      quantity: 2,
    });
    expect(cart.lines).toHaveLength(2);
    expect(cart.lines.map((l) => l.vendorId).sort()).toEqual(['vendor-a', 'vendor-b']);

    expect(() => cart.addItem({ ...baseLine, quantity: 100 })).toThrow(InvalidCartQuantityError);
  });

  it('merges quantity for same store+variant and rejects currency mismatch', () => {
    const cart = Cart.create({ guestToken: 'guest-1' });
    cart.addItem(baseLine);
    cart.addItem({ ...baseLine, quantity: 2, unitPriceSnapshotMinor: 480 });
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0]!.quantity).toBe(3);
    expect(cart.lines[0]!.unitPriceSnapshotMinor).toBe(480);

    expect(() =>
      cart.addItem({
        ...baseLine,
        variantId: 'var-x',
        offerId: 'offer-x',
        currencyCode: 'USD',
      }),
    ).toThrow(CartCurrencyMismatchError);
  });

  it('enforces vendor isolation when offer ownership diverges', () => {
    const cart = Cart.create({ customerId: 'customer-1' });
    cart.addItem(baseLine);
    expect(() =>
      cart.addItem({
        ...baseLine,
        vendorId: 'vendor-other',
        quantity: 1,
      }),
    ).toThrow(CartVendorIsolationError);
  });

  it('updates removes and clears lines', () => {
    const cart = Cart.create({ customerId: 'customer-1' });
    cart.addItem(baseLine);
    const lineId = cart.lines[0]!.lineId;
    cart.updateQuantity(lineId, 5);
    expect(cart.lines[0]!.quantity).toBe(5);
    cart.removeItem(lineId);
    cart.removeItem(lineId); // idempotent
    expect(cart.lines).toHaveLength(0);
    cart.addItem(baseLine);
    cart.clear();
    expect(cart.lines).toHaveLength(0);
    expect(cart.currencyCode).toBeNull();
  });

  it('marks checked out with version concurrency', () => {
    const cart = Cart.create({ customerId: 'customer-1' });
    cart.addItem(baseLine);
    const version = cart.version;
    cart.markCheckedOut(version);
    expect(cart.status).toBe('CHECKED_OUT');
    expect(() => cart.markCheckedOut(version)).toThrow(/not active|version/i);
  });
});
