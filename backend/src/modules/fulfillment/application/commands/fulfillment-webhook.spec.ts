import { describe, expect, it, vi } from 'vitest';
import { FulfillmentAccessDeniedError } from '../errors/fulfillment.errors';
import { ProcessCourierWebhookHandler } from './fulfillment-webhook.handlers';
import { FulfillmentWebhookController } from '../../presentation/http/fulfillment-webhook.controller';

describe('ProcessCourierWebhookHandler', () => {
  const createMockConfig = (options?: { steadfastSecret?: string; pathaoSecret?: string }) => ({
    steadfastWebhookSecret: options?.steadfastSecret,
    pathaoWebhookSecret: options?.pathaoSecret,
  });

  it('successfully transitions Steadfast shipment to DELIVERED and collects COD', async () => {
    let currentStatus = 'SHIPPED';
    const savedShipments: unknown[] = [];

    const shipment = {
      id: { value: 'ship-uuid-1' },
      orderId: 'ord-1',
      vendorId: 'vend-1',
      storeId: 'store-1',
      provider: 'STEADFAST' as const,
      get status() {
        return currentStatus;
      },
      amountToCollectMinor: 2500,
      currencyCode: 'BDT',
      applyProviderStatus: vi.fn((normalized: string) => {
        currentStatus = normalized;
      }),
    };

    const shipments = {
      findByProviderReference: vi.fn(async (provider: string, ref: string) => {
        if (ref === '1234567') {
          return shipment;
        }
        return null;
      }),
      save: vi.fn(async (s: unknown) => {
        savedShipments.push(s);
      }),
    };

    const payments = {
      findCodIntentByOrderId: vi.fn(async () => ({
        paymentIntentId: 'pi-cod-1',
        orderId: 'ord-1',
        amountMinor: 2500,
        currencyCode: 'BDT',
        status: 'AWAITING_COLLECTION',
        paymentMethod: 'COD' as const,
      })),
      confirmCodCollectionFromFulfillment: vi.fn(async () => ({
        paymentIntentId: 'pi-cod-1',
        orderId: 'ord-1',
        status: 'COLLECTED',
        collectionId: 'col-1',
      })),
    };

    const handler = new ProcessCourierWebhookHandler(
      shipments as never,
      payments as never,
      createMockConfig() as never,
    );

    const result = await handler.execute({
      provider: 'STEADFAST',
      payload: {
        consignment_id: 1234567,
        status: 'delivered',
      },
    });

    expect(result.received).toBe(true);
    expect(result.matched).toBe(true);
    expect(result.updated).toBe(true);
    expect(result.normalizedStatus).toBe('DELIVERED');
    expect(shipment.applyProviderStatus).toHaveBeenCalledWith('DELIVERED', 'delivered');
    expect(shipments.save).toHaveBeenCalled();
    expect(payments.confirmCodCollectionFromFulfillment).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentIntentId: 'pi-cod-1',
        amountMinor: 2500,
        currencyCode: 'BDT',
      }),
    );
  });

  it('rejects Steadfast webhook if secret token is configured but missing or invalid', async () => {
    const handler = new ProcessCourierWebhookHandler(
      {} as never,
      {} as never,
      createMockConfig({ steadfastSecret: 'super-secret-token' }) as never,
    );

    await expect(
      handler.execute({
        provider: 'STEADFAST',
        payload: { consignment_id: 12345 },
        signatureOrToken: 'wrong-token',
      }),
    ).rejects.toThrow(FulfillmentAccessDeniedError);

    await expect(
      handler.execute({
        provider: 'STEADFAST',
        payload: { consignment_id: 12345 },
      }),
    ).rejects.toThrow(FulfillmentAccessDeniedError);
  });

  it('handles Pathao webhook and matches by merchant_order_id', async () => {
    let currentStatus = 'PROCESSING';
    const shipment = {
      id: { value: 'ship-pathao-1' },
      orderId: 'ord-2',
      provider: 'PATHAO' as const,
      get status() {
        return currentStatus;
      },
      amountToCollectMinor: 0,
      currencyCode: 'BDT',
      applyProviderStatus: vi.fn((normalized: string) => {
        currentStatus = normalized;
      }),
    };

    const shipments = {
      findByProviderReference: vi.fn(async (provider: string, ref: string) => {
        if (ref === 'INV-999') {
          return shipment;
        }
        return null;
      }),
      save: vi.fn(async () => undefined),
    };

    const payments = {
      findCodIntentByOrderId: vi.fn(async () => null),
      confirmCodCollectionFromFulfillment: vi.fn(async () => undefined),
    };

    const handler = new ProcessCourierWebhookHandler(
      shipments as never,
      payments as never,
      createMockConfig({ pathaoSecret: 'pathao-webhook-secret' }) as never,
    );

    const result = await handler.execute({
      provider: 'PATHAO',
      payload: {
        merchant_order_id: 'INV-999',
        order_status: 'On_The_Way',
      },
      signatureOrToken: 'pathao-webhook-secret',
    });

    expect(result.received).toBe(true);
    expect(result.matched).toBe(true);
    expect(result.updated).toBe(true);
    expect(result.normalizedStatus).toBe('IN_TRANSIT');
    expect(payments.confirmCodCollectionFromFulfillment).not.toHaveBeenCalled();
  });

  it('returns matched=false gracefully when consignment reference is not found', async () => {
    const shipments = {
      findByProviderReference: vi.fn(async () => null),
      save: vi.fn(async () => undefined),
    };

    const handler = new ProcessCourierWebhookHandler(
      shipments as never,
      {} as never,
      createMockConfig() as never,
    );

    const result = await handler.execute({
      provider: 'STEADFAST',
      payload: {
        consignment_id: 'non-existent-999',
        status: 'delivered',
      },
    });

    expect(result.received).toBe(true);
    expect(result.matched).toBe(false);
    expect(result.updated).toBe(false);
  });

  it('FulfillmentWebhookController forwards requests to handler', async () => {
    const handler = {
      execute: vi.fn(async () => ({
        received: true as const,
        matched: true,
        updated: true,
        shipmentId: 'ship-1',
        normalizedStatus: 'DELIVERED' as const,
      })),
    };

    const controller = new FulfillmentWebhookController(handler as never);

    const steadfastRes = await controller.handleSteadfast(
      { consignment_id: 111, status: 'delivered' },
      'token-123',
    );
    expect(handler.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'STEADFAST',
        signatureOrToken: 'token-123',
      }),
    );
    expect(steadfastRes.received).toBe(true);

    const pathaoRes = await controller.handlePathao(
      { consignment_id: 222, order_status: 'Delivered' },
      'sig-pathao',
    );
    expect(handler.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'PATHAO',
        signatureOrToken: 'sig-pathao',
      }),
    );
    expect(pathaoRes.received).toBe(true);
  });
});
