import { describe, expect, it, vi } from 'vitest';
import { CheckoutSubmitHandler } from './checkout.handlers';
import {
  CheckoutCartConflictError,
  CheckoutCouponError,
  CheckoutInventoryError,
  CheckoutValidationError,
} from '../../domain/errors/checkout.errors';
import type { CheckoutOutcome } from '../../domain/checkout.types';

function baseCart(overrides: Record<string, unknown> = {}) {
  return {
    cartId: 'cart-1',
    customerId: 'customer-1',
    guestToken: null,
    currencyCode: 'BDT',
    status: 'ACTIVE',
    version: 3,
    lines: [
      {
        lineId: 'line-a',
        vendorId: 'vendor-a',
        storeId: 'store-a',
        productId: 'prod-a',
        variantId: 'var-a',
        offerId: 'offer-a',
        quantity: 1,
        unitPriceSnapshotMinor: 1000,
        currencyCode: 'BDT',
      },
      {
        lineId: 'line-b',
        vendorId: 'vendor-b',
        storeId: 'store-b',
        productId: 'prod-b',
        variantId: 'var-b',
        offerId: 'offer-b',
        quantity: 2,
        unitPriceSnapshotMinor: 500,
        currencyCode: 'BDT',
      },
    ],
    ...overrides,
  };
}

function quoteFor(storeId: string, lines: { lineId: string; quantity: number; unit: number }[]) {
  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unit, 0);
  return {
    currencyCode: 'BDT',
    vendorId: storeId === 'store-a' ? 'vendor-a' : 'vendor-b',
    storeId,
    lines: lines.map((l) => ({
      lineId: l.lineId,
      variantId: l.lineId.replace('line', 'var'),
      quantity: l.quantity,
      unitBasePriceMinor: l.unit,
      unitSalePriceMinor: l.unit,
      lineSubtotalMinor: l.quantity * l.unit,
      lineDiscountMinor: 0,
      lineTaxableMinor: l.quantity * l.unit,
      lineTaxMinor: 0,
      lineTotalMinor: l.quantity * l.unit,
    })),
    subtotalMinor: subtotal,
    discountMinor: 0,
    shippingMinor: 0,
    taxMinor: 0,
    commissionMinor: 0,
    totalMinor: subtotal,
    appliedPromotionId: null,
    appliedCouponCode: null,
    snapshot: { taxRateBps: 0, commissionRateBps: 0, evaluatedAt: new Date().toISOString() },
  };
}

describe('CheckoutSubmitHandler', () => {
  const address = {
    line1: '12 Road',
    city: 'Dhaka',
    countryCode: 'BD',
  };

  it('creates one order per vendor/store and is idempotent on retry', async () => {
    const cart = baseCart();
    const outcomeStore: { value: CheckoutOutcome | null } = { value: null };
    const checkouts = {
      findCompletedByIdempotencyKey: vi.fn(async () => outcomeStore.value),
      saveCompleted: vi.fn(async (input: { outcome: CheckoutOutcome }) => {
        outcomeStore.value = input.outcome;
      }),
    };
    const carts = {
      getOwnedCart: vi.fn(),
      validate: vi.fn(async () => ({ cart, issues: [], valid: true })),
      markCheckedOut: vi.fn(async () => ({ ...cart, status: 'CHECKED_OUT', version: 4 })),
    };
    const pricing = {
      quote: vi.fn(async (input: { storeId: string }) => {
        if (input.storeId === 'store-a') {
          return quoteFor('store-a', [{ lineId: 'line-a', quantity: 1, unit: 1000 }]);
        }
        return quoteFor('store-b', [{ lineId: 'line-b', quantity: 2, unit: 500 }]);
      }),
      recordUsage: vi.fn(),
    };
    const inventory = {
      pickWarehouseForReservation: vi.fn(async () => ({
        warehouseId: 'wh-1',
        available: 10,
      })),
      reserve: vi.fn(async () => ({ reservationId: Uniqueish(), availableAfter: 9 })),
      release: vi.fn(),
      checkAvailability: vi.fn(),
      checkStoreAvailability: vi.fn(),
      commit: vi.fn(),
    };
    const orders = {
      createFromCheckout: vi.fn(async (input: { storeId: string; totalMinor: number }) => ({
        orderId: `order-${input.storeId}`,
        orderNumber: `ORD-${input.storeId}`,
        vendorId: input.storeId === 'store-a' ? 'vendor-a' : 'vendor-b',
        storeId: input.storeId,
        totalMinor: input.totalMinor,
        currencyCode: 'BDT',
        status: 'PENDING_PAYMENT' as const,
      })),
    };
    const payments = {
      createIntent: vi.fn(async () => ({
        paymentIntentId: 'pi-1',
        status: 'REQUIRES_PAYMENT' as const,
        amountMinor: 2000,
        currencyCode: 'BDT',
        clientSecret: 'secret',
      })),
    };

    const handler = new CheckoutSubmitHandler(
      checkouts as never,
      carts as never,
      pricing as never,
      inventory as never,
      orders as never,
      payments as never,
    );

    const first = await handler.submit({
      owner: { customerId: 'customer-1' },
      cartId: 'cart-1',
      expectedCartVersion: 3,
      idempotencyKey: 'idem-1-xxxxxx',
      shippingAddress: address,
      shippingMethod: 'STANDARD',
      shippingMinor: 0,
    });
    expect(first.orders).toHaveLength(2);
    expect(first.orders.map((o) => o.storeId).sort()).toEqual(['store-a', 'store-b']);
    expect(orders.createFromCheckout).toHaveBeenCalledTimes(2);
    expect(carts.markCheckedOut).toHaveBeenCalled();

    const second = await handler.submit({
      owner: { customerId: 'customer-1' },
      cartId: 'cart-1',
      expectedCartVersion: 3,
      idempotencyKey: 'idem-1-xxxxxx',
      shippingAddress: address,
      shippingMethod: 'STANDARD',
    });
    expect(second.checkoutId).toBe(first.checkoutId);
    expect(orders.createFromCheckout).toHaveBeenCalledTimes(2);
  });

  it('fails on price/stock validation and coupon errors without creating orders', async () => {
    const checkouts = {
      findCompletedByIdempotencyKey: vi.fn(async () => null),
      saveCompleted: vi.fn(),
    };
    const carts = {
      validate: vi.fn(async () => ({
        cart: baseCart(),
        issues: [{ lineId: 'line-a', code: 'PRICE_CHANGED', message: 'price' }],
        valid: false,
      })),
      markCheckedOut: vi.fn(),
      getOwnedCart: vi.fn(),
    };
    const handler = new CheckoutSubmitHandler(
      checkouts as never,
      carts as never,
      { quote: vi.fn(), recordUsage: vi.fn() } as never,
      { pickWarehouseForReservation: vi.fn(), reserve: vi.fn(), release: vi.fn() } as never,
      { createFromCheckout: vi.fn() } as never,
      { createIntent: vi.fn() } as never,
    );

    await expect(
      handler.submit({
        owner: { customerId: 'customer-1' },
        cartId: 'cart-1',
        expectedCartVersion: 3,
        idempotencyKey: 'idem-price',
        shippingAddress: address,
        shippingMethod: 'STANDARD',
      }),
    ).rejects.toBeInstanceOf(CheckoutValidationError);

    const cartsOk = {
      validate: vi.fn(async () => ({ cart: baseCart(), issues: [], valid: true })),
      markCheckedOut: vi.fn(),
      getOwnedCart: vi.fn(),
    };
    const inventoryFail = {
      pickWarehouseForReservation: vi.fn(async () => null),
      reserve: vi.fn(),
      release: vi.fn(),
    };
    const pricingOk = {
      quote: vi.fn(async (input: { storeId: string }) =>
        input.storeId === 'store-a'
          ? quoteFor('store-a', [{ lineId: 'line-a', quantity: 1, unit: 1000 }])
          : quoteFor('store-b', [{ lineId: 'line-b', quantity: 2, unit: 500 }]),
      ),
      recordUsage: vi.fn(),
    };
    const handlerStock = new CheckoutSubmitHandler(
      checkouts as never,
      cartsOk as never,
      pricingOk as never,
      inventoryFail as never,
      { createFromCheckout: vi.fn() } as never,
      { createIntent: vi.fn() } as never,
    );
    await expect(
      handlerStock.submit({
        owner: { customerId: 'customer-1' },
        cartId: 'cart-1',
        expectedCartVersion: 3,
        idempotencyKey: 'idem-stock',
        shippingAddress: address,
        shippingMethod: 'STANDARD',
      }),
    ).rejects.toBeInstanceOf(CheckoutInventoryError);

    const pricingFail = {
      quote: vi.fn(async () => {
        const err = Object.assign(new Error('Coupon expired'), {
          code: 'PRICING_COUPON_EXPIRED',
        });
        throw err;
      }),
      recordUsage: vi.fn(),
    };
    const handlerCoupon = new CheckoutSubmitHandler(
      checkouts as never,
      cartsOk as never,
      pricingFail as never,
      inventoryFail as never,
      { createFromCheckout: vi.fn() } as never,
      { createIntent: vi.fn() } as never,
    );
    await expect(
      handlerCoupon.submit({
        owner: { customerId: 'customer-1' },
        cartId: 'cart-1',
        expectedCartVersion: 3,
        idempotencyKey: 'idem-coupon',
        shippingAddress: address,
        shippingMethod: 'STANDARD',
        couponCode: 'OLD',
      }),
    ).rejects.toBeInstanceOf(CheckoutCouponError);
  });

  it('rejects stale cart version (concurrent checkout)', async () => {
    const handler = new CheckoutSubmitHandler(
      {
        findCompletedByIdempotencyKey: vi.fn(async () => null),
        saveCompleted: vi.fn(),
      } as never,
      {
        validate: vi.fn(async () => ({
          cart: baseCart({ version: 9 }),
          issues: [],
          valid: true,
        })),
        markCheckedOut: vi.fn(),
        getOwnedCart: vi.fn(),
      } as never,
      { quote: vi.fn(), recordUsage: vi.fn() } as never,
      { pickWarehouseForReservation: vi.fn(), reserve: vi.fn(), release: vi.fn() } as never,
      { createFromCheckout: vi.fn() } as never,
      { createIntent: vi.fn() } as never,
    );

    await expect(
      handler.submit({
        owner: { customerId: 'customer-1' },
        cartId: 'cart-1',
        expectedCartVersion: 3,
        idempotencyKey: 'idem-concurrent',
        shippingAddress: address,
        shippingMethod: 'STANDARD',
      }),
    ).rejects.toBeInstanceOf(CheckoutCartConflictError);
  });
});

function Uniqueish(): string {
  return `res-${Math.random().toString(16).slice(2, 10)}`;
}
