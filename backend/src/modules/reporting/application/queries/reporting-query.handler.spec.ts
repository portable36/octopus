import { describe, expect, it, vi } from 'vitest';
import { ReportingAccessDeniedError, ReportingQueryHandler } from './reporting-query.handler';

describe('ReportingQueryHandler', () => {
  it('rejects non-platform actors for platform-wide reports', async () => {
    const facts = {
      summarizeOrders: vi.fn(),
      summarizeVendors: vi.fn(),
      summarizeStores: vi.fn(),
      getSalesAnalytics: vi.fn(),
    };
    const handler = new ReportingQueryHandler(facts as never);
    await expect(handler.orderSummary(['CUSTOMER'])).rejects.toBeInstanceOf(
      ReportingAccessDeniedError,
    );
    await expect(handler.vendorPerformance(['VENDOR_OWNER'])).rejects.toBeInstanceOf(
      ReportingAccessDeniedError,
    );
    await expect(handler.salesAnalytics(['STORE_MANAGER'])).rejects.toBeInstanceOf(
      ReportingAccessDeniedError,
    );
    expect(facts.summarizeOrders).not.toHaveBeenCalled();
    expect(facts.summarizeVendors).not.toHaveBeenCalled();
    expect(facts.getSalesAnalytics).not.toHaveBeenCalled();
  });

  it('returns summaries and sales trends for platform admin', async () => {
    const summary = { orderCount: 2, paidOrderCount: 1, currencies: [] };
    const vendors = [{ vendorId: 'v1', orderCount: 2, paidOrderCount: 1 }];
    const stores = [{ storeId: 's1', vendorId: 'v1', orderCount: 2 }];
    const sales = {
      summary,
      aovMinor: 1500,
      trends: [
        {
          date: '2026-09-01',
          orderCount: 2,
          paidOrderCount: 1,
          revenueMinor: 3000,
          commissionMinor: 300,
          aovMinor: 3000,
        },
      ],
      paymentMethods: [
        { paymentMethod: 'BKASH', orderCount: 2, paidOrderCount: 1, revenueMinor: 3000 },
      ],
    };

    const facts = {
      summarizeOrders: vi.fn().mockResolvedValue(summary),
      summarizeVendors: vi.fn().mockResolvedValue(vendors),
      summarizeStores: vi.fn().mockResolvedValue(stores),
      getSalesAnalytics: vi.fn().mockResolvedValue(sales),
    };
    const handler = new ReportingQueryHandler(facts as never);
    await expect(handler.orderSummary(['PLATFORM_ADMIN'])).resolves.toBe(summary);
    await expect(handler.vendorPerformance(['PLATFORM_ADMIN'])).resolves.toBe(vendors);
    await expect(handler.storePerformance(['PLATFORM_ADMIN'])).resolves.toBe(stores);
    await expect(handler.salesAnalytics(['PLATFORM_ADMIN'], 30)).resolves.toBe(sales);
    expect(facts.getSalesAnalytics).toHaveBeenCalledWith(30);
  });

  it('authorizes vendor owner and staff for vendorAnalytics, rejects unauthorized user', async () => {
    const vendorData = {
      scopeId: 'v-1',
      scopeType: 'VENDOR' as const,
      orderCount: 5,
      paidOrderCount: 4,
      revenueMinor: 10000,
      commissionMinor: 1000,
      aovMinor: 2500,
      currencies: [],
      trends: [],
      paymentMethods: [],
    };
    const facts = {
      getVendorAnalytics: vi.fn().mockResolvedValue(vendorData),
    };
    const vendors = {
      findById: vi.fn(async (id: string) => {
        if (id === 'v-1') {
          return {
            vendorId: 'v-1',
            ownerUserId: 'owner-user-1',
            staffUserIds: ['staff-user-1'],
          };
        }
        return null;
      }),
    };

    const handler = new ReportingQueryHandler(facts as never, vendors as never);

    // Platform admin allowed
    await expect(handler.vendorAnalytics('v-1', 'any-user', ['PLATFORM_ADMIN'])).resolves.toBe(
      vendorData,
    );

    // Vendor owner allowed
    await expect(handler.vendorAnalytics('v-1', 'owner-user-1', ['VENDOR_OWNER'])).resolves.toBe(
      vendorData,
    );

    // Vendor staff allowed
    await expect(handler.vendorAnalytics('v-1', 'staff-user-1', ['VENDOR_STAFF'])).resolves.toBe(
      vendorData,
    );

    // Unrelated user rejected
    await expect(
      handler.vendorAnalytics('v-1', 'stranger-user', ['VENDOR_OWNER']),
    ).rejects.toBeInstanceOf(ReportingAccessDeniedError);
  });

  it('authorizes store manager and staff for storeAnalytics, rejects unauthorized user', async () => {
    const storeData = {
      scopeId: 's-1',
      scopeType: 'STORE' as const,
      orderCount: 3,
      paidOrderCount: 2,
      revenueMinor: 5000,
      commissionMinor: 500,
      aovMinor: 2500,
      currencies: [],
      trends: [],
      paymentMethods: [],
    };
    const facts = {
      getStoreAnalytics: vi.fn().mockResolvedValue(storeData),
    };
    const stores = {
      findById: vi.fn(async (id: string) => {
        if (id === 's-1') {
          return {
            storeId: 's-1',
            vendorId: 'v-1',
            managerUserIds: ['mgr-user-1'],
            staffUserIds: ['staff-user-1'],
          };
        }
        return null;
      }),
    };
    const vendors = {
      findById: vi.fn(async (id: string) => {
        if (id === 'v-1') {
          return {
            vendorId: 'v-1',
            ownerUserId: 'vendor-owner-1',
            staffUserIds: [],
          };
        }
        return null;
      }),
    };

    const handler = new ReportingQueryHandler(facts as never, vendors as never, stores as never);

    // Platform admin allowed
    await expect(handler.storeAnalytics('s-1', 'any-user', ['PLATFORM_ADMIN'])).resolves.toBe(
      storeData,
    );

    // Store manager allowed
    await expect(handler.storeAnalytics('s-1', 'mgr-user-1', ['STORE_MANAGER'])).resolves.toBe(
      storeData,
    );

    // Store staff allowed
    await expect(handler.storeAnalytics('s-1', 'staff-user-1', ['STORE_STAFF'])).resolves.toBe(
      storeData,
    );

    // Vendor owner of store allowed
    await expect(handler.storeAnalytics('s-1', 'vendor-owner-1', ['VENDOR_OWNER'])).resolves.toBe(
      storeData,
    );

    // Unrelated user rejected
    await expect(
      handler.storeAnalytics('s-1', 'stranger-user', ['STORE_MANAGER']),
    ).rejects.toBeInstanceOf(ReportingAccessDeniedError);
  });

  it('handles topProducts authorization and retrieval', async () => {
    const products = [
      {
        productId: 'prod-1',
        variantId: 'var-1',
        unitsSold: 10,
        orderCount: 5,
        revenueMinor: 20000,
        currencyCode: 'BDT',
      },
    ];
    const facts = {
      getTopProducts: vi.fn().mockResolvedValue(products),
    };
    const vendors = {
      findById: vi.fn().mockResolvedValue({
        vendorId: 'v-1',
        ownerUserId: 'owner-1',
        staffUserIds: [],
      }),
    };
    const stores = {
      findById: vi.fn().mockResolvedValue({
        storeId: 's-1',
        vendorId: 'v-1',
        managerUserIds: ['mgr-1'],
        staffUserIds: [],
      }),
    };

    const handler = new ReportingQueryHandler(facts as never, vendors as never, stores as never);

    await expect(handler.topProducts(['PLATFORM_ADMIN'], 30, 5)).resolves.toBe(products);
    expect(facts.getTopProducts).toHaveBeenCalledWith({ days: 30, limit: 5 });

    await expect(
      handler.vendorTopProducts('v-1', 'owner-1', ['VENDOR_OWNER'], 30, 5),
    ).resolves.toBe(products);
    expect(facts.getTopProducts).toHaveBeenCalledWith({ vendorId: 'v-1', days: 30, limit: 5 });

    await expect(handler.storeTopProducts('s-1', 'mgr-1', ['STORE_MANAGER'], 30, 5)).resolves.toBe(
      products,
    );
    expect(facts.getTopProducts).toHaveBeenCalledWith({ storeId: 's-1', days: 30, limit: 5 });

    await expect(handler.topProducts(['VENDOR_OWNER'])).rejects.toBeInstanceOf(
      ReportingAccessDeniedError,
    );
  });

  it('handles refundAnalytics authorization and retrieval', async () => {
    const refundSummary = {
      totalRefundCount: 2,
      totalRefundedMinor: 3000,
      primaryCurrency: 'BDT',
      refundRatePercent: 4.5,
      refundsByMethod: [{ paymentMethod: 'BKASH', refundCount: 2, amountMinor: 3000 }],
      recentRefunds: [],
    };
    const facts = {
      getRefundAnalytics: vi.fn().mockResolvedValue(refundSummary),
    };
    const vendors = {
      findById: vi.fn().mockResolvedValue({
        vendorId: 'v-1',
        ownerUserId: 'owner-1',
        staffUserIds: [],
      }),
    };

    const handler = new ReportingQueryHandler(facts as never, vendors as never);

    await expect(handler.refundAnalytics(['PLATFORM_ADMIN'], 30)).resolves.toBe(refundSummary);
    expect(facts.getRefundAnalytics).toHaveBeenCalledWith({ days: 30 });

    await expect(
      handler.vendorRefundAnalytics('v-1', 'owner-1', ['VENDOR_OWNER'], 30),
    ).resolves.toBe(refundSummary);
    expect(facts.getRefundAnalytics).toHaveBeenCalledWith({ vendorId: 'v-1', days: 30 });

    await expect(handler.refundAnalytics(['VENDOR_OWNER'])).rejects.toBeInstanceOf(
      ReportingAccessDeniedError,
    );
  });
});
