import { describe, expect, it, vi } from 'vitest';
import { UniqueID } from '../../../../shared-kernel/domain/unique-id.value-object';
import { Order } from '../../domain/aggregates/order.aggregate';
import type {
  OrderFulfillmentStatus,
  OrderPaymentStatus,
  OrderStatus,
} from '../../domain/order.types';
import { OrderLifecycleHandler } from './order.handlers';
import type { OrderRepository } from '../ports/order-repository.interface';
import type { ShipmentTrackingPort } from '../../../../shared-kernel/application/ports/shipment-tracking.port';
import { OrderAuthorizationService } from '../services/order-authorization.service';

function createSampleOrder(props: {
  status?: OrderStatus;
  paymentStatus?: OrderPaymentStatus;
  paymentMethod?: 'COD' | 'BKASH';
  fulfillmentStatus?: OrderFulfillmentStatus;
}) {
  return Order.reconstitute(UniqueID.create(), {
    orderNumber: 'ORD-2026-0001',
    checkoutId: 'chk-1',
    idempotencyKey: 'idem-1',
    customerId: 'cust-1',
    vendorId: 'vend-1',
    storeId: 'store-1',
    currencyCode: 'BDT',
    subtotalMinor: 100000,
    discountMinor: 0,
    shippingMinor: 6000,
    taxMinor: 5000,
    commissionMinor: 2000,
    totalMinor: 111000,
    shippingMethod: 'STANDARD',
    shippingAddress: {
      line1: 'House 1, Road 2',
      city: 'Dhaka',
      countryCode: 'BD',
    },
    appliedPromotionId: null,
    appliedCouponCode: null,
    paymentMethod: props.paymentMethod ?? 'BKASH',
    pricingSnapshot: {
      taxRateBps: 500,
      commissionRateBps: 200,
      evaluatedAt: new Date().toISOString(),
    },
    attribution: null,
    status: props.status ?? 'PROCESSING',
    paymentStatus: props.paymentStatus ?? 'PAID',
    fulfillmentStatus: props.fulfillmentStatus ?? 'UNFULFILLED',
    lines: [],
    version: 1,
    createdAt: new Date('2026-09-01T10:00:00Z'),
    updatedAt: new Date('2026-09-01T12:00:00Z'),
  });
}

describe('Order Tracking Timeline', () => {
  it('computes timeline milestones when no shipments exist yet', async () => {
    const order = createSampleOrder({
      status: 'PROCESSING',
      paymentStatus: 'PAID',
    });

    const mockRepo: OrderRepository = {
      findById: vi.fn(async () => order),
      findByIdempotencyKey: vi.fn(),
      listByCustomerId: vi.fn(),
      listByStoreId: vi.fn(),
      listRecent: vi.fn(),
      save: vi.fn(),
    };

    const mockAuthz = new OrderAuthorizationService({} as never, {} as never);
    vi.spyOn(mockAuthz, 'getOwnedOrThrow').mockResolvedValue(order);

    const mockShipmentTracking: ShipmentTrackingPort = {
      getShipmentsForOrder: vi.fn(async () => []),
    };

    const handler = new OrderLifecycleHandler(mockRepo, mockAuthz, null, mockShipmentTracking);

    const result = await handler.getTrackingTimeline({
      orderId: 'ord-1234',
      actorUserId: 'cust-1',
      actorRoles: ['CUSTOMER'],
    });

    expect(result.orderNumber).toBe('ORD-2026-0001');
    expect(result.shipments).toHaveLength(0);

    const codes = result.milestones.map((m) => m.code);
    expect(codes).toContain('ORDER_PLACED');
    expect(codes).toContain('PAYMENT_CONFIRMED');
    expect(codes).toContain('PROCESSING');
    expect(codes).toContain('SHIPPED');
    expect(codes).toContain('DELIVERED');

    const placedMilestone = result.milestones.find((m) => m.code === 'ORDER_PLACED');
    expect(placedMilestone?.completed).toBe(true);

    const shippedMilestone = result.milestones.find((m) => m.code === 'SHIPPED');
    expect(shippedMilestone?.completed).toBe(false);
  });

  it('reflects active courier shipment and progresses to IN_TRANSIT and OUT_FOR_DELIVERY', async () => {
    const order = createSampleOrder({
      status: 'PROCESSING',
      paymentStatus: 'PAID',
    });

    const mockRepo: OrderRepository = {
      findById: vi.fn(async () => order),
      findByIdempotencyKey: vi.fn(),
      listByCustomerId: vi.fn(),
      listByStoreId: vi.fn(),
      listRecent: vi.fn(),
      save: vi.fn(),
    };

    const mockAuthz = new OrderAuthorizationService({} as never, {} as never);
    vi.spyOn(mockAuthz, 'getOwnedOrThrow').mockResolvedValue(order);

    const mockShipmentTracking: ShipmentTrackingPort = {
      getShipmentsForOrder: vi.fn(async () => [
        {
          shipmentId: 'ship-99',
          orderId: 'ord-1234',
          provider: 'STEADFAST',
          status: 'OUT_FOR_DELIVERY',
          providerStatus: 'in_review_delivery',
          trackingCode: 'ST-889900',
          providerConsignmentId: 'cons-123',
          recipientName: 'Amzad',
          recipientPhone: '01711112233',
          recipientAddress: 'Dhaka',
          createdAt: new Date('2026-09-02T08:00:00Z'),
          updatedAt: new Date('2026-09-02T14:00:00Z'),
        },
      ]),
    };

    const handler = new OrderLifecycleHandler(mockRepo, mockAuthz, null, mockShipmentTracking);

    const result = await handler.getTrackingTimeline({
      orderId: 'ord-1234',
      actorUserId: 'cust-1',
      actorRoles: ['CUSTOMER'],
    });

    expect(result.shipments).toHaveLength(1);
    expect(result.shipments[0]?.trackingCode).toBe('ST-889900');
    expect(result.shipments[0]?.provider).toBe('STEADFAST');

    const shipped = result.milestones.find((m) => m.code === 'SHIPPED');
    expect(shipped?.completed).toBe(true);
    expect(shipped?.description).toContain('ST-889900');

    const inTransit = result.milestones.find((m) => m.code === 'IN_TRANSIT');
    expect(inTransit?.completed).toBe(true);

    const outForDelivery = result.milestones.find((m) => m.code === 'OUT_FOR_DELIVERY');
    expect(outForDelivery?.completed).toBe(true);
    expect(outForDelivery?.current).toBe(true);

    const delivered = result.milestones.find((m) => m.code === 'DELIVERED');
    expect(delivered?.completed).toBe(false);
  });
});
