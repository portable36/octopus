import { describe, expect, it, vi } from 'vitest';
import { ReportingProjectionService } from './reporting-projection.service';

describe('ReportingProjectionService', () => {
  it('skips unknown event types', async () => {
    const orders = {
      getFulfillmentSnapshot: vi.fn(),
      getFinanceSnapshot: vi.fn(),
      getNotificationSnapshot: vi.fn(),
    };
    const facts = { upsert: vi.fn() };
    const service = new ReportingProjectionService(orders as never, facts as never);
    await service.handle('SomethingElse', { orderId: 'o1' });
    expect(facts.upsert).not.toHaveBeenCalled();
  });

  it('upserts order fact from OrderPaid snapshots', async () => {
    const orders = {
      getFulfillmentSnapshot: vi.fn().mockResolvedValue({
        orderId: 'o1',
        vendorId: 'v1',
        storeId: 's1',
        status: 'PAID',
        paymentStatus: 'PAID',
        paymentMethod: 'BKASH',
        currencyCode: 'BDT',
        totalMinor: 1000,
      }),
      getFinanceSnapshot: vi.fn().mockResolvedValue({
        orderId: 'o1',
        totalMinor: 1000,
        commissionMinor: 100,
      }),
      getNotificationSnapshot: vi.fn().mockResolvedValue({ customerId: 'c1' }),
    };
    const facts = { upsert: vi.fn().mockResolvedValue(undefined) };
    const service = new ReportingProjectionService(orders as never, facts as never);
    await service.handle('OrderPaid', { orderId: 'o1' });
    expect(facts.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'o1',
        vendorId: 'v1',
        storeId: 's1',
        customerId: 'c1',
        totalMinor: 1000,
        commissionMinor: 100,
        paymentStatus: 'PAID',
      }),
    );
  });
});
