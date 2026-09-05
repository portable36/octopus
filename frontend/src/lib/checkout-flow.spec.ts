import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stashCheckoutOutcome, readStashedCheckoutOutcome, type CheckoutOutcome } from './cart-api';

describe('checkout-flow and session storage', () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    const mockSessionStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        storage = {};
      },
    };
    vi.stubGlobal('window', {
      sessionStorage: mockSessionStorage,
    } as unknown as Window & typeof globalThis);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stashes and reads gateway checkout outcome with redirectUrl', () => {
    const outcome: CheckoutOutcome = {
      checkoutId: 'chk-gw-101',
      cartId: 'cart-101',
      cartVersion: 2,
      status: 'COMPLETED',
      paymentMethod: 'BKASH',
      totals: {
        subtotalMinor: 250000,
        discountMinor: 0,
        shippingMinor: 6000,
        taxMinor: 0,
        commissionMinor: 0,
        grandTotalMinor: 256000,
        currencyCode: 'BDT',
      },
      orders: [
        {
          orderId: 'ord-101',
          orderNumber: 'ORD-101',
          storeId: 'store-1',
          vendorId: 'vendor-1',
          paymentMethod: 'BKASH',
          paymentStatus: 'AWAITING_PAYMENT',
          totalMinor: 256000,
          currencyCode: 'BDT',
        },
      ],
      payments: [
        {
          paymentIntentId: 'pi-101',
          orderId: 'ord-101',
          paymentMethod: 'BKASH',
          amountMinor: 256000,
          currencyCode: 'BDT',
          status: 'REQUIRES_PAYMENT',
          redirectUrl: 'https://tokenized.sandbox.bka.sh/checkout?paymentID=pid-101',
        },
      ],
    };

    stashCheckoutOutcome(outcome);
    const read = readStashedCheckoutOutcome();

    expect(read).not.toBeNull();
    expect(read?.checkoutId).toBe('chk-gw-101');
    expect(read?.paymentMethod).toBe('BKASH');
    expect(read?.payments[0]?.redirectUrl).toBe(
      'https://tokenized.sandbox.bka.sh/checkout?paymentID=pid-101',
    );
  });

  it('handles corrupted or missing session outcome safely', () => {
    expect(readStashedCheckoutOutcome()).toBeNull();

    window.sessionStorage.setItem('octopus.checkoutOutcome', '{bad-json}');
    expect(readStashedCheckoutOutcome()).toBeNull();
  });
});
