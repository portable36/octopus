import { describe, expect, it } from 'vitest';
import { buildCustomerReportSummary } from './build-customer-report-summary';

describe('buildCustomerReportSummary', () => {
  it('counts unique customers, guests, and ranks by paid revenue', () => {
    const summary = buildCustomerReportSummary(
      [
        { customerId: 'c1', paymentStatus: 'PAID', totalMinor: 1000, currencyCode: 'BDT' },
        { customerId: 'c1', paymentStatus: 'PAID', totalMinor: 500, currencyCode: 'BDT' },
        { customerId: 'c2', paymentStatus: 'UNPAID', totalMinor: 9000, currencyCode: 'BDT' },
        { customerId: null, paymentStatus: 'PAID', totalMinor: 100, currencyCode: 'BDT' },
      ],
      10,
    );

    expect(summary.uniqueCustomerCount).toBe(2);
    expect(summary.guestOrderCount).toBe(1);
    expect(summary.orderCount).toBe(4);
    expect(summary.topCustomers[0]).toMatchObject({
      customerId: 'c1',
      orderCount: 2,
      paidOrderCount: 2,
      revenueMinor: 1500,
    });
    expect(summary.topCustomers[1]?.customerId).toBe('c2');
    expect(summary.topCustomers[1]?.revenueMinor).toBe(0);
  });
});
