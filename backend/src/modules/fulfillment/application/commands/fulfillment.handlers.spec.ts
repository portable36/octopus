import { describe, expect, it, vi } from 'vitest';
import { CreateShipmentHandler, SyncShipmentStatusHandler } from './fulfillment.handlers';

describe('Fulfillment handlers', () => {
  it('MANUAL create ships without external HTTP and zero COD for prepaid', async () => {
    const saved: unknown[] = [];
    const shipments = {
      findOperation: vi.fn(async () => null),
      findByIdempotencyKey: vi.fn(async () => null),
      save: vi.fn(async (s: unknown) => {
        saved.push(s);
      }),
      saveOperation: vi.fn(async () => undefined),
    };
    const orders = {
      prepareShipment: vi.fn(async () => ({
        orderId: 'ord-1',
        orderNumber: 'ORD-1',
        vendorId: 'v-1',
        storeId: 's-1',
        status: 'PROCESSING',
        paymentStatus: 'PAID',
        paymentMethod: 'SSLCOMMERZ',
        currencyCode: 'BDT',
        totalMinor: 2000,
        shippingAddress: { line1: 'Road 1', city: 'Dhaka', countryCode: 'BD' },
        lines: [
          { lineId: 'l1', quantity: 1, fulfilledQuantity: 0, productId: 'p', variantId: 'v' },
        ],
      })),
      fulfillShipmentLines: vi.fn(async () => undefined),
    };
    const payments = {
      findCodIntentByOrderId: vi.fn(async () => null),
    };
    const courier = {
      createConsignment: vi.fn(async () => ({
        providerConsignmentId: 'manual-1',
        trackingCode: null,
        providerStatus: 'pending',
      })),
    };
    const authz = { requireFulfiller: vi.fn(async () => undefined) };

    const handler = new CreateShipmentHandler(
      shipments as never,
      orders as never,
      payments as never,
      courier as never,
      authz as never,
    );

    const result = await handler.execute({
      orderId: 'ord-1',
      provider: 'MANUAL',
      lines: [{ lineId: 'l1', quantity: 1 }],
      recipientName: 'John Smith',
      recipientPhone: '01712345678',
      idempotencyKey: 'idem-ship-1',
      actorUserId: 'mgr-1',
      actorRoles: ['STORE_MANAGER'],
    });

    expect(result.status).toBe('SHIPPED');
    expect(result.amountToCollectMinor).toBe(0);
    expect(courier.createConsignment).toHaveBeenCalledWith(
      expect.objectContaining({ amountToCollectMinor: 0, provider: 'MANUAL' }),
    );
    expect(orders.fulfillShipmentLines).toHaveBeenCalled();
  });

  it('sync DELIVERED collects COD once via trusted payment seam', async () => {
    const shipmentState = {
      id: { value: 'ship-1' },
      orderId: 'ord-1',
      vendorId: 'v-1',
      storeId: 's-1',
      provider: 'STEADFAST' as const,
      status: 'SHIPPED' as string,
      providerConsignmentId: '1424107',
      trackingCode: '15BAEB8A',
      merchantOrderRef: 'ORD-1',
      amountToCollectMinor: 1500,
      currencyCode: 'BDT',
      applyProviderStatus: vi.fn(function (this: { status: string }, next: string) {
        this.status = next;
      }),
    };

    const shipments = {
      findById: vi.fn(async () => shipmentState),
      save: vi.fn(async () => undefined),
    };
    const courier = {
      getConsignmentStatus: vi.fn(async () => ({
        providerStatus: 'delivered',
        normalizedStatus: 'DELIVERED',
        rawStatus: 'delivered',
      })),
    };
    const payments = {
      findCodIntentByOrderId: vi.fn(async () => ({
        paymentIntentId: 'pi-1',
        orderId: 'ord-1',
        amountMinor: 1500,
        currencyCode: 'BDT',
        status: 'AWAITING_COLLECTION',
        paymentMethod: 'COD' as const,
      })),
      confirmCodCollectionFromFulfillment: vi.fn(async () => ({
        paymentIntentId: 'pi-1',
        orderId: 'ord-1',
        paymentMethod: 'COD',
        status: 'COLLECTED',
        amountMinor: 1500,
        currencyCode: 'BDT',
        collectionId: 'col-1',
        collectedAt: new Date().toISOString(),
      })),
    };
    const authz = { requireFulfiller: vi.fn(async () => undefined) };

    const sync = new SyncShipmentStatusHandler(
      shipments as never,
      courier as never,
      payments as never,
      authz as never,
    );

    await sync.execute({
      shipmentId: 'ship-1',
      actorUserId: 'staff-1',
      actorRoles: ['STORE_STAFF'],
      idempotencyKey: 'sync-cod-1',
    });

    expect(payments.confirmCodCollectionFromFulfillment).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentIntentId: 'pi-1',
        amountMinor: 1500,
        idempotencyKey: 'sync-cod-1',
      }),
    );
  });
});
