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

function accessMocks(codEnabled = true) {
  return {
    stores: {
      findById: vi.fn(async (storeId: string) => ({
        storeId,
        vendorId: storeId === 'store-a' ? 'vendor-a' : 'vendor-b',
        status: 'active',
        displayName: storeId,
        slug: storeId,
        description: null,
        locale: 'en-BD',
        currencyCode: 'BDT',
        acceptsOnlineOrders: true,
        addressLine1: 'x',
        city: 'Dhaka',
        region: null,
        managerUserIds: [],
        staffUserIds: [],
        codEnabled,
        codMinAmountMinor: 0,
        codMaxAmountMinor: null,
        codReservationTtlHours: 72,
      })),
    },
    vendors: {
      findById: vi.fn(async (vendorId: string) => ({
        vendorId,
        status: 'active',
        ownerUserId: 'owner-1',
        staffUserIds: [],
        currencyCode: 'BDT',
        codEnabled,
        codMinAmountMinor: 0,
        codMaxAmountMinor: null,
        codReservationTtlHours: 72,
      })),
    },
    config: {
      codReservationTtlHours: 72,
      codMinAmountMinor: 0,
      codMaxAmountMinor: null,
    },
  };
}

function mockGlobalConfig() {
  return {
    get: vi.fn(async (_group: string, _key: string, defaultValue?: unknown) => defaultValue),
  };
}

function buildHandler(deps: {
  checkouts?: unknown;
  carts?: unknown;
  pricing?: unknown;
  inventory?: unknown;
  orders?: unknown;
  payments?: unknown;
  codEnabled?: boolean;
}) {
  const access = accessMocks(deps.codEnabled ?? true);
  return new CheckoutSubmitHandler(
    (deps.checkouts ?? {
      findCompletedByIdempotencyKey: vi.fn(async () => null),
      claim: vi.fn(async (input: { claimToken: string }) => ({
        status: 'CLAIMED' as const,
        claimToken: input.claimToken,
      })),
      complete: vi.fn(),
      release: vi.fn(),
    }) as never,
    (deps.carts ?? {
      validate: vi.fn(async () => ({ cart: baseCart(), issues: [], valid: true })),
      markCheckedOut: vi.fn(),
      getOwnedCart: vi.fn(),
    }) as never,
    (deps.pricing ?? { quote: vi.fn(), recordUsage: vi.fn() }) as never,
    (deps.inventory ?? {
      pickWarehouseForReservation: vi.fn(),
      reserve: vi.fn(),
      release: vi.fn(),
    }) as never,
    (deps.orders ?? { createFromCheckout: vi.fn() }) as never,
    (deps.payments ?? {
      isPaymentMethodAvailable: vi.fn(async () => true),
      createIntent: vi.fn(),
    }) as never,
    access.stores as never,
    access.vendors as never,
    access.config as never,
    mockGlobalConfig() as never,
  );
}

describe('CheckoutSubmitHandler', () => {
  const address = {
    line1: '12 Road',
    city: 'Dhaka',
    countryCode: 'BD',
  };

  it('creates one order + payment intent per store and is idempotent on retry', async () => {
    const cart = baseCart();
    const outcomeStore: { value: CheckoutOutcome | null } = { value: null };
    const checkouts = {
      findCompletedByIdempotencyKey: vi.fn(async () => outcomeStore.value),
      claim: vi.fn(async (input: { claimToken: string; requestHash: string }) => {
        if (outcomeStore.value) {
          return {
            status: 'COMPLETED' as const,
            requestHash: input.requestHash,
            outcome: outcomeStore.value,
          };
        }
        return { status: 'CLAIMED' as const, claimToken: input.claimToken };
      }),
      complete: vi.fn(async (input: { outcome: CheckoutOutcome }) => {
        outcomeStore.value = input.outcome;
      }),
      release: vi.fn(),
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
      isPaymentMethodAvailable: vi.fn(async () => true),
      createIntent: vi.fn(async (input: { orderId: string; amountMinor: number }) => ({
        paymentIntentId: `pi-${input.orderId}`,
        paymentMethod: 'COD' as const,
        status: 'AWAITING_COLLECTION',
        amountMinor: input.amountMinor,
        currencyCode: 'BDT',
      })),
    };

    const handler = buildHandler({ checkouts, carts, pricing, inventory, orders, payments });

    const first = await handler.submit({
      owner: { customerId: 'customer-1' },
      cartId: 'cart-1',
      expectedCartVersion: 3,
      idempotencyKey: 'idem-1-xxxxxx',
      paymentMethod: 'COD',
      shippingAddress: address,
      shippingMethod: 'STANDARD',
      shippingMinor: 999,
      taxRateBps: 50_000,
      commissionRateBps: 50_000,
    } as never);
    expect(first.orders).toHaveLength(2);
    expect(first.payments).toHaveLength(2);
    expect(first.cartVersion).toBe(4);
    expect(first.payments.every((p) => p.status === 'AWAITING_COLLECTION')).toBe(true);
    expect(first.payments.every((p) => p.clientSecret === undefined)).toBe(true);
    expect(first.totals.shippingMinor).toBe(0);
    expect(first.totals.grandTotalMinor).toBe(2000);
    expect(pricing.quote).toHaveBeenCalledWith(expect.objectContaining({ shippingMinor: 0 }));
    expect(pricing.quote.mock.calls[0]?.[0]).not.toHaveProperty('taxRateBps');
    expect(pricing.quote.mock.calls[0]?.[0]).not.toHaveProperty('commissionRateBps');
    expect(orders.createFromCheckout).toHaveBeenCalledTimes(2);
    expect(payments.createIntent).toHaveBeenCalledTimes(2);
    expect(carts.markCheckedOut).toHaveBeenCalled();

    const second = await handler.submit({
      owner: { customerId: 'customer-1' },
      cartId: 'cart-1',
      expectedCartVersion: 3,
      idempotencyKey: 'idem-1-xxxxxx',
      paymentMethod: 'COD',
      shippingAddress: address,
      shippingMethod: 'STANDARD',
    });
    expect(second.checkoutId).toBe(first.checkoutId);
    expect(orders.createFromCheckout).toHaveBeenCalledTimes(2);
  });

  it('rejects COD when store or vendor disables it', async () => {
    const pricing = {
      quote: vi.fn(async (input: { storeId: string }) =>
        input.storeId === 'store-a'
          ? quoteFor('store-a', [{ lineId: 'line-a', quantity: 1, unit: 1000 }])
          : quoteFor('store-b', [{ lineId: 'line-b', quantity: 2, unit: 500 }]),
      ),
      recordUsage: vi.fn(),
    };
    const handler = buildHandler({ pricing, codEnabled: false });
    await expect(
      handler.submit({
        owner: { customerId: 'customer-1' },
        cartId: 'cart-1',
        expectedCartVersion: 3,
        idempotencyKey: 'idem-cod-off',
        paymentMethod: 'COD',
        shippingAddress: address,
        shippingMethod: 'STANDARD',
      }),
    ).rejects.toBeInstanceOf(CheckoutValidationError);
  });

  it('rejects unavailable gateway methods before creating orders or reservations', async () => {
    const pricing = {
      quote: vi.fn(async (input: { storeId: string }) =>
        input.storeId === 'store-a'
          ? quoteFor('store-a', [{ lineId: 'line-a', quantity: 1, unit: 1000 }])
          : quoteFor('store-b', [{ lineId: 'line-b', quantity: 2, unit: 500 }]),
      ),
      recordUsage: vi.fn(),
    };
    const inventory = {
      pickWarehouseForReservation: vi.fn(async () => ({ warehouseId: 'wh-1', available: 10 })),
      reserve: vi.fn(async () => ({ reservationId: Uniqueish(), availableAfter: 9 })),
      release: vi.fn(),
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
      isPaymentMethodAvailable: vi.fn(async () => false),
      createIntent: vi.fn(async (input: { orderId: string; amountMinor: number }) => ({
        paymentIntentId: `pi-${input.orderId}`,
        paymentMethod: 'SSLCOMMERZ' as const,
        status: 'REQUIRES_PAYMENT',
        amountMinor: input.amountMinor,
        currencyCode: 'BDT',
        clientSecret: 'secret',
      })),
    };
    const carts = {
      validate: vi.fn(),
      markCheckedOut: vi.fn(),
      getOwnedCart: vi.fn(),
    };
    const handler = buildHandler({ pricing, inventory, orders, payments, carts });
    await expect(
      handler.submit({
        owner: { customerId: 'customer-1' },
        cartId: 'cart-1',
        expectedCartVersion: 3,
        idempotencyKey: 'idem-gateway',
        paymentMethod: 'SSLCOMMERZ',
        shippingAddress: address,
        shippingMethod: 'STANDARD',
      }),
    ).rejects.toMatchObject({
      code: 'CHECKOUT_VALIDATION_FAILED',
      issues: [{ code: 'PAYMENT_METHOD_UNAVAILABLE' }],
    });
    expect(carts.validate).not.toHaveBeenCalled();
    expect(orders.createFromCheckout).not.toHaveBeenCalled();
    expect(inventory.reserve).not.toHaveBeenCalled();
  });

  it('returns an in-progress conflict for a concurrent idempotent checkout', async () => {
    const cart = baseCart();
    const checkouts = {
      claim: vi.fn(async (input: { requestHash: string }) => ({
        status: 'IN_PROGRESS' as const,
        requestHash: input.requestHash,
      })),
      complete: vi.fn(),
      release: vi.fn(),
    };
    const carts = {
      validate: vi.fn(async () => ({ cart, issues: [], valid: true })),
      markCheckedOut: vi.fn(),
      getOwnedCart: vi.fn(),
    };
    const pricing = {
      quote: vi.fn(async (input: { storeId: string }) =>
        input.storeId === 'store-a'
          ? quoteFor('store-a', [{ lineId: 'line-a', quantity: 1, unit: 1000 }])
          : quoteFor('store-b', [{ lineId: 'line-b', quantity: 2, unit: 500 }]),
      ),
      recordUsage: vi.fn(),
    };
    const orders = { createFromCheckout: vi.fn() };
    const inventory = {
      pickWarehouseForReservation: vi.fn(),
      reserve: vi.fn(),
      release: vi.fn(),
    };
    const handler = buildHandler({ checkouts, carts, pricing, orders, inventory });

    await expect(
      handler.submit({
        owner: { customerId: 'customer-1' },
        cartId: 'cart-1',
        expectedCartVersion: 3,
        idempotencyKey: 'idem-in-progress',
        paymentMethod: 'COD',
        shippingAddress: address,
        shippingMethod: 'STANDARD',
      }),
    ).rejects.toMatchObject({ code: 'CHECKOUT_IN_PROGRESS' });
    expect(orders.createFromCheckout).not.toHaveBeenCalled();
    expect(inventory.reserve).not.toHaveBeenCalled();
  });

  it('fails on price/stock validation and coupon errors without creating orders', async () => {
    const handler = buildHandler({
      carts: {
        validate: vi.fn(async () => ({
          cart: baseCart(),
          issues: [{ lineId: 'line-a', code: 'PRICE_CHANGED', message: 'price' }],
          valid: false,
        })),
        markCheckedOut: vi.fn(),
        getOwnedCart: vi.fn(),
      },
    });

    await expect(
      handler.submit({
        owner: { customerId: 'customer-1' },
        cartId: 'cart-1',
        expectedCartVersion: 3,
        idempotencyKey: 'idem-price',
        paymentMethod: 'SSLCOMMERZ',
        shippingAddress: address,
        shippingMethod: 'STANDARD',
      }),
    ).rejects.toBeInstanceOf(CheckoutValidationError);

    const pricingOk = {
      quote: vi.fn(async (input: { storeId: string }) =>
        input.storeId === 'store-a'
          ? quoteFor('store-a', [{ lineId: 'line-a', quantity: 1, unit: 1000 }])
          : quoteFor('store-b', [{ lineId: 'line-b', quantity: 2, unit: 500 }]),
      ),
      recordUsage: vi.fn(),
    };
    const handlerStock = buildHandler({
      pricing: pricingOk,
      inventory: {
        pickWarehouseForReservation: vi.fn(async () => null),
        reserve: vi.fn(),
        release: vi.fn(),
      },
    });
    await expect(
      handlerStock.submit({
        owner: { customerId: 'customer-1' },
        cartId: 'cart-1',
        expectedCartVersion: 3,
        idempotencyKey: 'idem-stock',
        paymentMethod: 'SSLCOMMERZ',
        shippingAddress: address,
        shippingMethod: 'STANDARD',
      }),
    ).rejects.toBeInstanceOf(CheckoutInventoryError);

    const handlerCoupon = buildHandler({
      pricing: {
        quote: vi.fn(async () => {
          throw Object.assign(new Error('Coupon expired'), { code: 'PRICING_COUPON_EXPIRED' });
        }),
        recordUsage: vi.fn(),
      },
      inventory: {
        pickWarehouseForReservation: vi.fn(async () => null),
        reserve: vi.fn(),
        release: vi.fn(),
      },
    });
    await expect(
      handlerCoupon.submit({
        owner: { customerId: 'customer-1' },
        cartId: 'cart-1',
        expectedCartVersion: 3,
        idempotencyKey: 'idem-coupon',
        paymentMethod: 'SSLCOMMERZ',
        shippingAddress: address,
        shippingMethod: 'STANDARD',
        couponCode: 'OLD',
      }),
    ).rejects.toBeInstanceOf(CheckoutCouponError);
  });

  it('rejects stale cart version (concurrent checkout)', async () => {
    const handler = buildHandler({
      carts: {
        validate: vi.fn(async () => ({
          cart: baseCart({ version: 9 }),
          issues: [],
          valid: true,
        })),
        markCheckedOut: vi.fn(),
        getOwnedCart: vi.fn(),
      },
    });

    await expect(
      handler.submit({
        owner: { customerId: 'customer-1' },
        cartId: 'cart-1',
        expectedCartVersion: 3,
        idempotencyKey: 'idem-concurrent',
        paymentMethod: 'SSLCOMMERZ',
        shippingAddress: address,
        shippingMethod: 'STANDARD',
      }),
    ).rejects.toBeInstanceOf(CheckoutCartConflictError);
  });

  it('propagates gateway redirectUrl when submitting gateway checkout', async () => {
    const cart = baseCart();
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
      isPaymentMethodAvailable: vi.fn(async () => true),
      createIntent: vi.fn(async (input: { orderId: string; amountMinor: number }) => ({
        paymentIntentId: `pi-${input.orderId}`,
        paymentMethod: 'BKASH' as const,
        status: 'REQUIRES_PAYMENT',
        amountMinor: input.amountMinor,
        currencyCode: 'BDT',
        redirectUrl: `https://tokenized.sandbox.bka.sh/checkout?paymentID=pid-${input.orderId}`,
      })),
    };
    const handler = buildHandler({ carts, pricing, inventory, orders, payments });
    const result = await handler.submit({
      owner: { customerId: 'customer-1' },
      cartId: 'cart-1',
      expectedCartVersion: 3,
      idempotencyKey: 'idem-bkash-redirect',
      paymentMethod: 'BKASH',
      shippingAddress: address,
      shippingMethod: 'STANDARD',
    });

    expect(result.payments).toHaveLength(2);
    expect(result.payments[0]?.redirectUrl).toContain(
      'https://tokenized.sandbox.bka.sh/checkout?paymentID=',
    );
    expect(result.payments[0]?.paymentMethod).toBe('BKASH');
  });
});

function Uniqueish(): string {
  return `res-${Math.random().toString(16).slice(2, 10)}`;
}
