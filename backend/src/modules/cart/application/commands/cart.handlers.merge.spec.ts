import { describe, expect, it, vi } from 'vitest';
import { Cart } from '../../domain/aggregates/cart.aggregate';
import { CartCommandHandler } from './cart.handlers';

describe('CartCommandHandler.mergeGuestCart', () => {
  it('merges guest lines into customer cart and abandons guest', async () => {
    const guest = Cart.create({ guestToken: 'guest-token-xyz' });
    guest.addItem({
      vendorId: 'v1',
      storeId: 's1',
      productId: 'p1',
      variantId: 'var1',
      offerId: 'o1',
      quantity: 2,
      unitPriceSnapshotMinor: 100,
      currencyCode: 'BDT',
    });
    const customer = Cart.create({ customerId: 'cust-1' });
    const save = vi.fn(async (cart: Cart) => cart);
    const handler = new CartCommandHandler(
      {
        save,
        findById: vi.fn(),
        findActiveByCustomerId: vi.fn().mockResolvedValue(customer),
        findActiveByGuestToken: vi.fn().mockResolvedValue(guest),
      } as never,
      { findByStoreAndVariant: vi.fn() } as never,
      { getAvailability: vi.fn() } as never,
      { quote: vi.fn() } as never,
    );

    const merged = await handler.mergeGuestCart({
      customerId: 'cust-1',
      guestToken: 'guest-token-xyz',
    });

    expect(merged.lines).toHaveLength(1);
    expect(merged.lines[0]?.quantity).toBe(2);
    expect(guest.status).toBe('ABANDONED');
    expect(save).toHaveBeenCalledTimes(2);
  });
});
