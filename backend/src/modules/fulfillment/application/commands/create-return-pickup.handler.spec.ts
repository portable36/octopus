import { describe, expect, it, vi } from 'vitest';
import { CreateReturnPickupHandler } from './create-return-pickup.handler';
import { Shipment } from '../../domain/aggregates/shipment.aggregate';

describe('CreateReturnPickupHandler', () => {
  it('creates a MANUAL reverse shipment without fulfilling order lines', async () => {
    const returnId = 'aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaaaa';
    const orderId = 'bbbbbbbb-bbbb-7bbb-8bbb-bbbbbbbbbbbb';
    const shipments = {
      findOperation: vi.fn().mockResolvedValue(null),
      findByIdempotencyKey: vi.fn().mockResolvedValue(null),
      save: vi.fn(async (_shipment: Shipment) => undefined),
      saveOperation: vi.fn().mockResolvedValue(undefined),
    };
    const orders = {
      getReturnSnapshot: vi.fn().mockResolvedValue({
        orderId,
        orderNumber: 'ORD-9',
        vendorId: 'vvvvvvvv-vvvv-7vvv-8vvv-vvvvvvvvvvvv',
        storeId: 'ssssssss-ssss-7sss-8sss-ssssssssssss',
        currencyCode: 'BDT',
      }),
      fulfillShipmentLines: vi.fn(),
      prepareShipment: vi.fn(),
    };
    const courier = {
      createConsignment: vi.fn().mockResolvedValue({
        providerConsignmentId: 'consign-1',
        trackingCode: null,
        providerStatus: 'pending',
      }),
    };

    const handler = new CreateReturnPickupHandler(
      shipments as never,
      orders as never,
      courier as never,
    );
    const result = await handler.execute({
      returnId,
      orderId,
      vendorId: 'vvvvvvvv-vvvv-7vvv-8vvv-vvvvvvvvvvvv',
      storeId: 'ssssssss-ssss-7sss-8sss-ssssssssssss',
      currencyCode: 'BDT',
      lines: [{ orderLineId: 'line-1', quantity: 1 }],
      recipientName: 'Customer',
      recipientPhone: '01700000000',
      recipientAddress: 'Dhaka',
      idempotencyKey: `return-pickup:${returnId}`,
    });

    expect(result.provider).toBe('MANUAL');
    expect(result.trackingCode).toMatch(/^RET-/);
    expect(orders.fulfillShipmentLines).not.toHaveBeenCalled();
    expect(orders.prepareShipment).not.toHaveBeenCalled();
    expect(shipments.save).toHaveBeenCalled();
    const lastShipment = shipments.save.mock.calls.at(-1)?.[0] as Shipment;
    expect(lastShipment.note).toContain('RETURN_PICKUP:');
  });
});
