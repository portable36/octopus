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
      markCheckedOut: vi.fn(),
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
          productStatus: 'published',
          variantStatus: 'ACTIVE',
          isSellable: true,
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
          productStatus: 'published',
          variantStatus: 'ACTIVE',
          isSellable: true,
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
      markCheckedOut: vi.fn(),
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

  it('rejects addItem and flags validate issues when offer is not sellable', async () => {
    const cart = Cart.create({ customerId: 'customer-1' });
    const repo: CartRepository = {
      save: vi.fn(),
      markCheckedOut: vi.fn(),
      findById: vi.fn(async () => cart),
      findActiveByCustomerId: vi.fn(),
      findActiveByGuestToken: vi.fn(),
    };
    const unsellableOffer = {
      offerId: 'offer-unsellable',
      vendorId: 'vendor-a',
      storeId: 'store-a',
      productId: 'prod-1',
      variantId: 'var-1',
      priceMinor: 500,
      currencyCode: 'BDT',
      status: 'active',
      isAvailable: true,
      productStatus: 'draft',
      variantStatus: 'DRAFT',
      isSellable: false,
    };
    const offers = {
      findByStoreAndVariant: vi.fn(async () => unsellableOffer),
      findManyByStoreAndVariant: vi.fn(async () => [unsellableOffer]),
    };
    const handler = new CartCommandHandler(
      repo,
      offers as never,
      {
        checkStoreAvailability: vi
          .fn()
          .mockResolvedValue({ status: 'AVAILABLE', availableQuantity: 10 }),
      } as never,
      { quote: vi.fn() } as never,
    );

    // addItem fails
    await expect(
      handler.addItem({
        cartId: cart.id.value,
        owner: { customerId: 'customer-1' },
        storeId: 'store-a',
        variantId: 'var-1',
        quantity: 1,
      }),
    ).rejects.toMatchObject({ code: 'CART_OFFER_UNAVAILABLE' });

    // validate flags issue
    cart.addItem({
      vendorId: 'vendor-a',
      storeId: 'store-a',
      productId: 'prod-1',
      variantId: 'var-1',
      offerId: 'offer-unsellable',
      quantity: 1,
      unitPriceSnapshotMinor: 500,
      currencyCode: 'BDT',
    });

    const result = await handler.validate({
      cartId: cart.id.value,
      owner: { customerId: 'customer-1' },
    });
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'OFFER_UNAVAILABLE',
        }),
      ]),
    );
  });
});

describe('CartCommandHandler.markCheckedOut', () => {
  it('surfaces an atomic version conflict without falling back to an overwrite save', async () => {
    const cart = seedCart();
    const save = vi.fn();
    const markCheckedOut = vi.fn(async () => null);
    const handler = new CartCommandHandler(
      {
        save,
        markCheckedOut,
        findById: vi.fn(async () => cart),
        findActiveByCustomerId: vi.fn(),
        findActiveByGuestToken: vi.fn(),
      } as never,
      { findByStoreAndVariant: vi.fn() } as never,
      { getAvailability: vi.fn() } as never,
      { quote: vi.fn() } as never,
    );

    await expect(
      handler.markCheckedOut({
        cartId: cart.id.value,
        expectedVersion: cart.version,
        owner: { customerId: 'customer-1' },
      }),
    ).rejects.toMatchObject({ code: 'CART_VERSION_CONFLICT' });
    expect(markCheckedOut).toHaveBeenCalledWith(cart.id.value, cart.version);
    expect(save).not.toHaveBeenCalled();
  });
});
