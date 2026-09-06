import { describe, expect, it, vi } from 'vitest';
import { FulfillmentStatusPollerService } from './fulfillment-status-poller.service';

describe('FulfillmentStatusPollerService', () => {
  const createMockConfig = (options?: { enabled?: boolean; isTest?: boolean }) => ({
    isTest: options?.isTest ?? false,
    fulfillmentStatusPollEnabled: options?.enabled ?? true,
    fulfillmentStatusPollIntervalMs: 60000,
  });

  it('polls active shipments, invokes syncShipment, and aggregates stats', async () => {
    const shipment1 = {
      id: { value: 'ship-1' },
      provider: 'STEADFAST' as const,
      status: 'SHIPPED',
    };
    const shipment2 = {
      id: { value: 'ship-2' },
      provider: 'PATHAO' as const,
      status: 'IN_TRANSIT',
    };

    const shipments = {
      findActiveCourierShipments: vi.fn(async () => [shipment1, shipment2]),
    };

    const syncHandler = {
      syncShipment: vi.fn(async (s: { id: { value: string } }) => {
        if (s.id.value === 'ship-1') {
          return {
            statusChanged: true,
            becameDelivered: true,
            previousStatus: 'SHIPPED' as const,
            currentStatus: 'DELIVERED' as const,
          };
        }
        return {
          statusChanged: false,
          becameDelivered: false,
          previousStatus: 'IN_TRANSIT' as const,
          currentStatus: 'IN_TRANSIT' as const,
        };
      }),
    };

    const poller = new FulfillmentStatusPollerService(
      createMockConfig() as never,
      shipments as never,
      syncHandler as never,
    );

    const result = await poller.pollNow(50);

    expect(shipments.findActiveCourierShipments).toHaveBeenCalledWith(50);
    expect(syncHandler.syncShipment).toHaveBeenCalledTimes(2);
    expect(result.polled).toBe(2);
    expect(result.transitioned).toBe(1);
    expect(result.delivered).toBe(1);
    expect(result.errors).toBe(0);
  });

  it('handles sync errors per shipment gracefully without failing entire cycle', async () => {
    const shipmentOk = { id: { value: 'ship-ok' }, provider: 'STEADFAST' as const };
    const shipmentFail = { id: { value: 'ship-fail' }, provider: 'PATHAO' as const };

    const shipments = {
      findActiveCourierShipments: vi.fn(async () => [shipmentOk, shipmentFail]),
    };

    const syncHandler = {
      syncShipment: vi.fn(async (s: { id: { value: string } }) => {
        if (s.id.value === 'ship-fail') {
          throw new Error('Courier API timeout');
        }
        return {
          statusChanged: true,
          becameDelivered: false,
          previousStatus: 'SHIPPED' as const,
          currentStatus: 'IN_TRANSIT' as const,
        };
      }),
    };

    const poller = new FulfillmentStatusPollerService(
      createMockConfig() as never,
      shipments as never,
      syncHandler as never,
    );

    const result = await poller.pollNow();

    expect(result.polled).toBe(2);
    expect(result.transitioned).toBe(1);
    expect(result.delivered).toBe(0);
    expect(result.errors).toBe(1);
  });

  it('cleans up interval timer onModuleDestroy', () => {
    const poller = new FulfillmentStatusPollerService(
      createMockConfig({ enabled: true, isTest: false }) as never,
      {} as never,
      {} as never,
    );

    poller.onModuleInit();
    expect(() => poller.onModuleDestroy()).not.toThrow();
  });
});
