/** Aggregate distinct buyers from reporting order facts (guest rows omit customerId). */
export type CustomerFactRow = {
  readonly customerId: string | null;
  readonly paymentStatus: string;
  readonly totalMinor: number;
  readonly currencyCode: string;
};

export type CustomerPerformanceRow = {
  readonly customerId: string;
  readonly orderCount: number;
  readonly paidOrderCount: number;
  readonly revenueMinor: number;
  readonly currencyCode: string;
};

export type CustomerReportSummary = {
  readonly uniqueCustomerCount: number;
  readonly guestOrderCount: number;
  readonly orderCount: number;
  readonly topCustomers: readonly CustomerPerformanceRow[];
};

export function buildCustomerReportSummary(
  rows: readonly CustomerFactRow[],
  limit = 20,
): CustomerReportSummary {
  const capped = Math.max(1, Math.min(100, limit));
  const byCustomer = new Map<
    string,
    {
      orderCount: number;
      paidOrderCount: number;
      revenueByCurrency: Map<string, number>;
    }
  >();
  let guestOrderCount = 0;

  for (const row of rows) {
    if (!row.customerId) {
      guestOrderCount += 1;
      continue;
    }
    const acc = byCustomer.get(row.customerId) ?? {
      orderCount: 0,
      paidOrderCount: 0,
      revenueByCurrency: new Map<string, number>(),
    };
    acc.orderCount += 1;
    if (row.paymentStatus === 'PAID') {
      acc.paidOrderCount += 1;
      acc.revenueByCurrency.set(
        row.currencyCode,
        (acc.revenueByCurrency.get(row.currencyCode) ?? 0) + row.totalMinor,
      );
    }
    byCustomer.set(row.customerId, acc);
  }

  const topCustomers: CustomerPerformanceRow[] = [...byCustomer.entries()]
    .map(([customerId, acc]) => {
      let currencyCode = 'BDT';
      let revenueMinor = 0;
      for (const [code, minor] of acc.revenueByCurrency) {
        if (minor >= revenueMinor) {
          currencyCode = code;
          revenueMinor = minor;
        }
      }
      return {
        customerId,
        orderCount: acc.orderCount,
        paidOrderCount: acc.paidOrderCount,
        revenueMinor,
        currencyCode,
      };
    })
    .sort((a, b) => b.revenueMinor - a.revenueMinor || b.orderCount - a.orderCount)
    .slice(0, capped);

  return {
    uniqueCustomerCount: byCustomer.size,
    guestOrderCount,
    orderCount: rows.length,
    topCustomers,
  };
}
