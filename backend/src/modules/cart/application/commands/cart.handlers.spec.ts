import { describe, expect, it, vi } from 'vitest';
import { Cart } from '../../domain/aggregates/cart.aggregate';
import { CartCommandHandler } from './cart.handlers';
import type { CartRepository } from '../ports/cart-repository.interface';

function seedCart(): Cart {
  const cart = Cart.create({ customerId: 'customer-1' });
  cart.addItem({
    vendorId: 'vendor-a',
    storeId: 'store-a',
    productId: 'prod-1',
    variantId: 'var-1',
    offerId: 'offer-1',
    quantity: 2,
    unitPriceSnapshotMinor: 500,
    currencyCode: 'BDT',
  });
  cart.addItem({
    vendorId: 'vendor-b',
    storeId: 'store-b',
    productId: 'prod-2',
    variantId: 'var-2',
    offerId: 'offer-2',
    quantity: 1,
    unitPriceSnapshotMinor: 300,
    currencyCode: 'BDT',
  });
  return cart;
}

describe('CartCommandHandler.validate', () => {
  it('reports price changes, insufficient stock, and keeps multi-vendor lines isolated', async () => {
    const cart = seedCart();
    const repo: CartRepository = {
      save: vi.fn(),
      findById: vi.fn(async () => cart),
      findActiveByCustomerId: vi.fn(),
      findActiveByGuestToken: vi.fn(),
    };
    const offers = {
      findByStoreAndVariant: vi.fn(),
      findManyByStoreAndVariant: vi.fn(async () => [
        {
          offerId: 'offer-1',
          vendorId: 'vendor-a',
          storeId: 'store-a',
          productId: 'prod-1',
          variantId: 'var-1',
          priceMinor: 550,
          currencyCode: 'BDT',
          status: 'active',
          isAvailable: true,
        },
        {
          offerId: 'offer-2',
          vendorId: 'vendor-b',
          storeId: 'store-b',
          productId: 'prod-2',
          variantId: 'var-2',
          priceMinor: 300,
          currencyCode: 'BDT',
          status: 'active',
          isAvailable: true,
        },
      ]),
    };
    const inventory = {
      checkAvailability: vi.fn(),
      checkStoreAvailability: vi.fn(async ({ storeId }: { storeId: string }) => {
        if (storeId === 'store-a') {
          return { storeId, variantId: 'var-1', available: 1, status: 'ACTIVE' as const };
        }
        return { storeId, variantId: 'var-2', available: 10, status: 'ACTIVE' as const };
      }),
      reserve: vi.fn(),
      release: vi.fn(),
      commit: vi.fn(),
    };
    const pricing = { quote: vi.fn(), recordUsage: vi.fn() };

    const handler = new CartCommandHandler(
      repo,
      offers as never,
      inventory as never,
      pricing as never,
    );

    const result = await handler.validate({
      cartId: cart.id.value,
      owner: { customerId: 'customer-1' },
    });

    expect(result.valid).toBe(false);
    expect(result.issues.map((i) => i.code).sort()).toEqual([
      'INSUFFICIENT_STOCK',
      'PRICE_CHANGED',
    ]);
    expect(result.cart.lines.map((l) => l.vendorId).sort()).toEqual(['vendor-a', 'vendor-b']);
    expect(offers.findManyByStoreAndVariant).toHaveBeenCalledWith([
      { storeId: 'store-a', variantId: 'var-1' },
      { storeId: 'store-b', variantId: 'var-2' },
    ]);
  });

  it('rejects access across customer ownership (vendor isolation of customer carts)', async () => {
    const cart = seedCart();
    const repo: CartRepository = {
      save: vi.fn(),
      findById: vi.fn(async () => cart),
      findActiveByCustomerId: vi.fn(),
      findActiveByGuestToken: vi.fn(),
    };
    const handler = new CartCommandHandler(
      repo,
      { findByStoreAndVariant: vi.fn(), findManyByStoreAndVariant: vi.fn() } as never,
      { checkStoreAvailability: vi.fn() } as never,
      { quote: vi.fn() } as never,
    );

    await expect(
      handler.get(cart.id.value, { customerId: 'other-customer' }),
    ).rejects.toMatchObject({ code: 'CART_ACCESS_DENIED' });
  });
});
