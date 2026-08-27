import { describe, expect, it, vi } from 'vitest';
import { ReportingAccessDeniedError, ReportingQueryHandler } from './reporting-query.handler';

describe('ReportingQueryHandler', () => {
  it('rejects non-platform actors', async () => {
    const facts = {
      summarizeOrders: vi.fn(),
      summarizeVendors: vi.fn(),
      summarizeStores: vi.fn(),
    };
    const handler = new ReportingQueryHandler(facts as never);
    await expect(handler.orderSummary(['CUSTOMER'])).rejects.toBeInstanceOf(
      ReportingAccessDeniedError,
    );
    await expect(handler.vendorPerformance(['VENDOR_OWNER'])).rejects.toBeInstanceOf(
      ReportingAccessDeniedError,
    );
    expect(facts.summarizeOrders).not.toHaveBeenCalled();
    expect(facts.summarizeVendors).not.toHaveBeenCalled();
  });

  it('returns summaries for platform admin', async () => {
    const summary = { orderCount: 2, paidOrderCount: 1, currencies: [] };
    const vendors = [{ vendorId: 'v1', orderCount: 2, paidOrderCount: 1 }];
    const stores = [{ storeId: 's1', vendorId: 'v1', orderCount: 2 }];
    const facts = {
      summarizeOrders: vi.fn().mockResolvedValue(summary),
      summarizeVendors: vi.fn().mockResolvedValue(vendors),
      summarizeStores: vi.fn().mockResolvedValue(stores),
    };
    const handler = new ReportingQueryHandler(facts as never);
    await expect(handler.orderSummary(['PLATFORM_ADMIN'])).resolves.toBe(summary);
    await expect(handler.vendorPerformance(['PLATFORM_ADMIN'])).resolves.toBe(vendors);
    await expect(handler.storePerformance(['PLATFORM_ADMIN'])).resolves.toBe(stores);
  });
});
