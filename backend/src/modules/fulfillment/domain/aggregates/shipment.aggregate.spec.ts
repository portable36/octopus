import { describe, expect, it } from 'vitest';
import { Shipment } from './shipment.aggregate';
import { InvalidShipmentTransitionError } from '../errors/fulfillment.errors';

describe('Shipment aggregate', () => {
  it('creates pending and marks shipped', () => {
    const shipment = Shipment.create({
      orderId: 'ord-1',
      orderNumber: 'ORD-1',
      vendorId: 'v-1',
      storeId: 's-1',
      provider: 'MANUAL',
      lines: [{ orderLineId: 'l1', quantity: 1 }],
      recipient: {
        name: 'John Smith',
        phone: '01712345678',
        secondaryPhone: null,
        address: 'House 1, Road 2, Dhaka-1209, BD',
      },
      amountToCollectMinor: 1500,
      currencyCode: 'BDT',
      merchantOrderRef: 'ORD-1-abc',
      itemSummary: 'l1',
      weightKg: 0.5,
    });
    expect(shipment.status).toBe('PENDING');
    shipment.markShipped({
      providerConsignmentId: 'c-1',
      trackingCode: 'T-1',
      providerStatus: 'pending',
    });
    expect(shipment.status).toBe('SHIPPED');
    shipment.applyProviderStatus('DELIVERED', 'delivered');
    expect(shipment.status).toBe('DELIVERED');
    expect(() => shipment.applyProviderStatus('FAILED', 'cancelled')).toThrow(
      InvalidShipmentTransitionError,
    );
  });

  it('manual deliver path', () => {
    const shipment = Shipment.create({
      orderId: 'ord-1',
      orderNumber: 'ORD-1',
      vendorId: 'v-1',
      storeId: 's-1',
      provider: 'MANUAL',
      lines: [{ orderLineId: 'l1', quantity: 1 }],
      recipient: {
        name: 'Jane Doe',
        phone: '01812345678',
        secondaryPhone: null,
        address: 'House 3, Road 4, Dhaka-1212, BD',
      },
      amountToCollectMinor: 0,
      currencyCode: 'BDT',
      merchantOrderRef: 'ORD-1-def',
      itemSummary: 'l1',
      weightKg: 1,
    });
    shipment.markShipped({
      providerConsignmentId: shipment.id.value,
      trackingCode: null,
      providerStatus: 'pending',
    });
    shipment.markDeliveredManual('TRACK-9');
    expect(shipment.status).toBe('DELIVERED');
    expect(shipment.trackingCode).toBe('TRACK-9');
  });
});
