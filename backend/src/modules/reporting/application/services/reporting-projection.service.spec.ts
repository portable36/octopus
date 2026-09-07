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
    const facts = {
      upsert: vi.fn().mockResolvedValue(undefined),
      upsertItemFacts: vi.fn().mockResolvedValue(undefined),
      recordRefundFact: vi.fn().mockResolvedValue(undefined),
    };
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

  it('upserts item facts when return snapshot lines exist', async () => {
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
      getReturnSnapshot: vi.fn().mockResolvedValue({
        orderId: 'o1',
        lines: [
          {
            lineId: 'l1',
            productId: 'p1',
            variantId: 'var-1',
            quantity: 2,
            unitPriceMinor: 500,
            lineTotalMinor: 1000,
            currencyCode: 'BDT',
          },
        ],
      }),
    };
    const facts = {
      upsert: vi.fn().mockResolvedValue(undefined),
      upsertItemFacts: vi.fn().mockResolvedValue(undefined),
    };
    const service = new ReportingProjectionService(orders as never, facts as never);
    await service.handle('OrderPaid', { orderId: 'o1' });

    expect(facts.upsertItemFacts).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          orderId: 'o1',
          lineId: 'l1',
          productId: 'p1',
          variantId: 'var-1',
          quantity: 2,
          totalMinor: 1000,
          paymentStatus: 'PAID',
        }),
      ]),
    );
  });

  it('records refund fact on RefundCompleted event', async () => {
    const orders = {
      getFulfillmentSnapshot: vi.fn(),
      getFinanceSnapshot: vi.fn(),
      getNotificationSnapshot: vi.fn(),
      getReturnSnapshot: vi.fn(),
    };
    const facts = {
      upsert: vi.fn(),
      recordRefundFact: vi.fn().mockResolvedValue(undefined),
    };
    const service = new ReportingProjectionService(orders as never, facts as never);
    await service.handle('RefundCompleted', {
      refundId: 'ref-1',
      orderId: 'o1',
      vendorId: 'v1',
      storeId: 's1',
      returnId: 'ret-1',
      amountMinor: 500,
      currencyCode: 'BDT',
      method: 'SSLCOMMERZ',
    });

    expect(facts.recordRefundFact).toHaveBeenCalledWith(
      expect.objectContaining({
        refundId: 'ref-1',
        orderId: 'o1',
        vendorId: 'v1',
        storeId: 's1',
        returnId: 'ret-1',
        amountMinor: 500,
        currencyCode: 'BDT',
        paymentMethod: 'SSLCOMMERZ',
      }),
    );
  });
});
