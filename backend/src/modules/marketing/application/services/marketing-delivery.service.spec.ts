import { describe, expect, it, vi } from 'vitest';
import { MarketingDeliveryService } from './marketing-delivery.service';

function finance(overrides: Record<string, unknown> = {}) {
  return {
    orderId: 'o1',
    vendorId: 'v1',
    storeId: 's1',
    paymentStatus: 'PAID',
    paymentMethod: 'SSLCOMMERZ',
    currencyCode: 'BDT',
    subtotalMinor: 1000,
    discountMinor: 0,
    commissionMinor: 50,
    totalMinor: 1000,
    commissionRateBps: 500,
    ...overrides,
  };
}

function fulfillment(overrides: Record<string, unknown> = {}) {
  return {
    orderId: 'o1',
    orderNumber: 'ORD-1',
    vendorId: 'v1',
    storeId: 's1',
    status: 'PAID',
    paymentStatus: 'PAID',
    paymentMethod: 'SSLCOMMERZ',
    currencyCode: 'BDT',
    totalMinor: 1000,
    shippingAddress: {
      line1: 'x',
      city: 'Dhaka',
      countryCode: 'BD',
    },
    lines: [
      { lineId: 'l1', quantity: 1, fulfilledQuantity: 0, productId: 'p1', variantId: 'var1' },
    ],
    ...overrides,
  };
}

describe('MarketingDeliveryService', () => {
  it('skips COD OrderPaid purchase; sends on CodCollected', async () => {
    const ga4 = {
      sendPurchase: vi.fn(async () => ({ status: 'SKIPPED', detail: null })),
      sendRefund: vi.fn(),
    };
    const meta = {
      sendPurchase: vi.fn(async () => ({ status: 'SKIPPED', detail: null })),
      sendRefund: vi.fn(),
    };
    const events = { record: vi.fn(async () => undefined) };
    const orders = {
      getFinanceSnapshot: vi.fn(async () => finance({ paymentMethod: 'COD' })),
      getFulfillmentSnapshot: vi.fn(async () => fulfillment({ paymentMethod: 'COD' })),
    };
    const marketingSettings = {
      getRuntime: vi.fn(async () => ({
        schemaVersion: 1 as const,
        gtmContainerId: null,
        ga4MeasurementId: null,
        ga4MpApiSecret: null,
        metaPixelId: null,
        metaCapiToken: null,
        enabled: true,
      })),
      getPublic: vi.fn(),
    };

    const service = new MarketingDeliveryService(
      orders as never,
      ga4 as never,
      meta as never,
      events as never,
      marketingSettings as never,
    );

    await service.handle('OrderPaid', { orderId: 'o1' });
    expect(ga4.sendPurchase).not.toHaveBeenCalled();
    expect(meta.sendPurchase).not.toHaveBeenCalled();

    await service.handle('CodCollected', { orderId: 'o1' });
    expect(ga4.sendPurchase).toHaveBeenCalledTimes(1);
    expect(meta.sendPurchase).toHaveBeenCalledTimes(1);
    expect(ga4.sendPurchase).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: 'ORD-1',
        items: [expect.objectContaining({ itemId: 'var1' })],
      }),
    );
  });

  it('sends purchase on gateway OrderPaid', async () => {
    const ga4 = {
      sendPurchase: vi.fn(async () => ({ status: 'SENT', detail: null })),
      sendRefund: vi.fn(),
    };
    const meta = {
      sendPurchase: vi.fn(async () => ({ status: 'SENT', detail: null })),
      sendRefund: vi.fn(),
    };
    const events = { record: vi.fn(async () => undefined) };
    const orders = {
      getFinanceSnapshot: vi.fn(async () => finance()),
      getFulfillmentSnapshot: vi.fn(async () => fulfillment()),
    };
    const marketingSettings = {
      getRuntime: vi.fn(async () => ({
        schemaVersion: 1 as const,
        gtmContainerId: null,
        ga4MeasurementId: 'G-X',
        ga4MpApiSecret: 'secret',
        metaPixelId: 'px',
        metaCapiToken: 'tok',
        enabled: true,
      })),
      getPublic: vi.fn(),
    };

    const service = new MarketingDeliveryService(
      orders as never,
      ga4 as never,
      meta as never,
      events as never,
      marketingSettings as never,
    );

    await service.handle('OrderPaid', { orderId: 'o1' });
    expect(ga4.sendPurchase).toHaveBeenCalledTimes(1);
    expect(meta.sendPurchase).toHaveBeenCalledTimes(1);
    expect(events.record).toHaveBeenCalled();
  });
});
