import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type {
  DetailedSalesAnalytics,
  OrderReportCurrencyBucket,
  OrderReportSummary,
  PaymentMethodSummary,
  ReportingOrderFact,
  ReportingOrderFactRepository,
  ScopedAnalyticsSummary,
  StorePerformanceRow,
  TrendDataPoint,
  VendorPerformanceRow,
} from '../../application/ports/reporting-order-fact-repository.interface';
import { ReportingOrderFactOrmEntity } from './reporting-order-fact.orm-entity';

function emptyCurrency(currencyCode: string): OrderReportCurrencyBucket {
  return {
    currencyCode,
    orderCount: 0,
    paidOrderCount: 0,
    revenueMinor: 0,
    commissionMinor: 0,
  };
}

function addCurrency(
  map: Map<string, OrderReportCurrencyBucket>,
  currencyCode: string,
  paid: boolean,
  totalMinor: number,
  commissionMinor: number,
): void {
  const existing = map.get(currencyCode) ?? emptyCurrency(currencyCode);
  map.set(currencyCode, {
    currencyCode,
    orderCount: existing.orderCount + 1,
    paidOrderCount: existing.paidOrderCount + (paid ? 1 : 0),
    revenueMinor: existing.revenueMinor + (paid ? totalMinor : 0),
    commissionMinor: existing.commissionMinor + (paid ? commissionMinor : 0),
  });
}

function sortedCurrencies(
  map: Map<string, OrderReportCurrencyBucket>,
): OrderReportCurrencyBucket[] {
  return [...map.values()].sort((a, b) => a.currencyCode.localeCompare(b.currencyCode));
}

function computeTrendsAndPaymentMethods(rows: ReportingOrderFactOrmEntity[]): {
  readonly trends: TrendDataPoint[];
  readonly paymentMethods: PaymentMethodSummary[];
  readonly aovMinor: number;
} {
  const trendMap = new Map<
    string,
    {
      orderCount: number;
      paidOrderCount: number;
      revenueMinor: number;
      commissionMinor: number;
    }
  >();

  const pmMap = new Map<
    string,
    {
      orderCount: number;
      paidOrderCount: number;
      revenueMinor: number;
    }
  >();

  let totalRevenueMinor = 0;
  let totalPaidOrders = 0;

  for (const row of rows) {
    const paid = row.paymentStatus === 'PAID';
    if (paid) {
      totalRevenueMinor += row.totalMinor;
      totalPaidOrders += 1;
    }

    const dateStr = (row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt))
      .toISOString()
      .slice(0, 10);

    const trendAcc = trendMap.get(dateStr) ?? {
      orderCount: 0,
      paidOrderCount: 0,
      revenueMinor: 0,
      commissionMinor: 0,
    };
    trendAcc.orderCount += 1;
    if (paid) {
      trendAcc.paidOrderCount += 1;
      trendAcc.revenueMinor += row.totalMinor;
      trendAcc.commissionMinor += row.commissionMinor;
    }
    trendMap.set(dateStr, trendAcc);

    const pm = row.paymentMethod || 'UNKNOWN';
    const pmAcc = pmMap.get(pm) ?? {
      orderCount: 0,
      paidOrderCount: 0,
      revenueMinor: 0,
    };
    pmAcc.orderCount += 1;
    if (paid) {
      pmAcc.paidOrderCount += 1;
      pmAcc.revenueMinor += row.totalMinor;
    }
    pmMap.set(pm, pmAcc);
  }

  const trends: TrendDataPoint[] = [...trendMap.entries()]
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, acc]) => ({
      date,
      orderCount: acc.orderCount,
      paidOrderCount: acc.paidOrderCount,
      revenueMinor: acc.revenueMinor,
      commissionMinor: acc.commissionMinor,
      aovMinor: acc.paidOrderCount > 0 ? Math.round(acc.revenueMinor / acc.paidOrderCount) : 0,
    }));

  const paymentMethods: PaymentMethodSummary[] = [...pmMap.entries()]
    .sort((a, b) => b[1].revenueMinor - a[1].revenueMinor)
    .map(([paymentMethod, acc]) => ({
      paymentMethod,
      orderCount: acc.orderCount,
      paidOrderCount: acc.paidOrderCount,
      revenueMinor: acc.revenueMinor,
    }));

  const aovMinor = totalPaidOrders > 0 ? Math.round(totalRevenueMinor / totalPaidOrders) : 0;

  return { trends, paymentMethods, aovMinor };
}

@Injectable()
export class ReportingOrderFactRepositoryAdapter implements ReportingOrderFactRepository {
  constructor(private readonly em: EntityManager) {}

  public async upsert(fact: ReportingOrderFact): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      let entity = await tx.findOne(ReportingOrderFactOrmEntity, { orderId: fact.orderId });
      if (!entity) {
        entity = new ReportingOrderFactOrmEntity();
        entity.orderId = fact.orderId;
        entity.createdAt = fact.createdAt;
      }
      entity.vendorId = fact.vendorId;
      entity.storeId = fact.storeId;
      entity.customerId = fact.customerId;
      entity.currencyCode = fact.currencyCode;
      entity.totalMinor = fact.totalMinor;
      entity.commissionMinor = fact.commissionMinor;
      entity.status = fact.status;
      entity.paymentStatus = fact.paymentStatus;
      entity.paymentMethod = fact.paymentMethod;
      entity.paidAt =
        fact.paymentStatus === 'PAID' ? (entity.paidAt ?? fact.paidAt ?? fact.updatedAt) : null;
      entity.updatedAt = fact.updatedAt;
      await tx.persist(entity).flush();
    });
  }

  public async summarizeOrders(): Promise<OrderReportSummary> {
    return withRlsContext(this.em, async (tx) => {
      const rows = await tx.find(ReportingOrderFactOrmEntity, {});
      const byCurrency = new Map<string, OrderReportCurrencyBucket>();
      let orderCount = 0;
      let paidOrderCount = 0;

      for (const row of rows) {
        orderCount += 1;
        const paid = row.paymentStatus === 'PAID';
        if (paid) {
          paidOrderCount += 1;
        }
        addCurrency(byCurrency, row.currencyCode, paid, row.totalMinor, row.commissionMinor);
      }

      return {
        currencies: sortedCurrencies(byCurrency),
        orderCount,
        paidOrderCount,
      };
    });
  }

  public async summarizeVendors(): Promise<readonly VendorPerformanceRow[]> {
    return withRlsContext(this.em, async (tx) => {
      const rows = await tx.find(ReportingOrderFactOrmEntity, {});
      type Acc = {
        vendorId: string;
        currencies: Map<string, OrderReportCurrencyBucket>;
        orderCount: number;
        paidOrderCount: number;
        revenueMinor: number;
        commissionMinor: number;
      };
      const byVendor = new Map<string, Acc>();

      for (const row of rows) {
        const paid = row.paymentStatus === 'PAID';
        const acc = byVendor.get(row.vendorId) ?? {
          vendorId: row.vendorId,
          currencies: new Map(),
          orderCount: 0,
          paidOrderCount: 0,
          revenueMinor: 0,
          commissionMinor: 0,
        };
        acc.orderCount += 1;
        if (paid) {
          acc.paidOrderCount += 1;
          acc.revenueMinor += row.totalMinor;
          acc.commissionMinor += row.commissionMinor;
        }
        addCurrency(acc.currencies, row.currencyCode, paid, row.totalMinor, row.commissionMinor);
        byVendor.set(row.vendorId, acc);
      }

      return [...byVendor.values()]
        .map((acc) => ({
          vendorId: acc.vendorId,
          currencies: sortedCurrencies(acc.currencies),
          orderCount: acc.orderCount,
          paidOrderCount: acc.paidOrderCount,
          revenueMinor: acc.revenueMinor,
          commissionMinor: acc.commissionMinor,
        }))
        .sort((a, b) => b.revenueMinor - a.revenueMinor || a.vendorId.localeCompare(b.vendorId));
    });
  }

  public async summarizeStores(): Promise<readonly StorePerformanceRow[]> {
    return withRlsContext(this.em, async (tx) => {
      const rows = await tx.find(ReportingOrderFactOrmEntity, {});
      type Acc = {
        storeId: string;
        vendorId: string;
        currencies: Map<string, OrderReportCurrencyBucket>;
        orderCount: number;
        paidOrderCount: number;
        revenueMinor: number;
        commissionMinor: number;
      };
      const byStore = new Map<string, Acc>();

      for (const row of rows) {
        const paid = row.paymentStatus === 'PAID';
        const acc = byStore.get(row.storeId) ?? {
          storeId: row.storeId,
          vendorId: row.vendorId,
          currencies: new Map(),
          orderCount: 0,
          paidOrderCount: 0,
          revenueMinor: 0,
          commissionMinor: 0,
        };
        acc.orderCount += 1;
        if (paid) {
          acc.paidOrderCount += 1;
          acc.revenueMinor += row.totalMinor;
          acc.commissionMinor += row.commissionMinor;
        }
        addCurrency(acc.currencies, row.currencyCode, paid, row.totalMinor, row.commissionMinor);
        byStore.set(row.storeId, acc);
      }

      return [...byStore.values()]
        .map((acc) => ({
          storeId: acc.storeId,
          vendorId: acc.vendorId,
          currencies: sortedCurrencies(acc.currencies),
          orderCount: acc.orderCount,
          paidOrderCount: acc.paidOrderCount,
          revenueMinor: acc.revenueMinor,
          commissionMinor: acc.commissionMinor,
        }))
        .sort((a, b) => b.revenueMinor - a.revenueMinor || a.storeId.localeCompare(b.storeId));
    });
  }

  public async getSalesAnalytics(days = 30): Promise<DetailedSalesAnalytics> {
    return withRlsContext(this.em, async (tx) => {
      const cutoff = new Date(Date.now() - Math.max(1, days) * 24 * 60 * 60 * 1000);
      const rows = await tx.find(
        ReportingOrderFactOrmEntity,
        { createdAt: { $gte: cutoff } },
        { orderBy: { createdAt: 'ASC' } },
      );

      const byCurrency = new Map<string, OrderReportCurrencyBucket>();
      let orderCount = 0;
      let paidOrderCount = 0;

      for (const row of rows) {
        orderCount += 1;
        const paid = row.paymentStatus === 'PAID';
        if (paid) {
          paidOrderCount += 1;
        }
        addCurrency(byCurrency, row.currencyCode, paid, row.totalMinor, row.commissionMinor);
      }

      const { trends, paymentMethods, aovMinor } = computeTrendsAndPaymentMethods(rows);

      return {
        summary: {
          currencies: sortedCurrencies(byCurrency),
          orderCount,
          paidOrderCount,
        },
        aovMinor,
        trends,
        paymentMethods,
      };
    });
  }

  public async getVendorAnalytics(vendorId: string, days = 30): Promise<ScopedAnalyticsSummary> {
    return withRlsContext(this.em, async (tx) => {
      const cutoff = new Date(Date.now() - Math.max(1, days) * 24 * 60 * 60 * 1000);
      const rows = await tx.find(
        ReportingOrderFactOrmEntity,
        { vendorId, createdAt: { $gte: cutoff } },
        { orderBy: { createdAt: 'ASC' } },
      );

      const byCurrency = new Map<string, OrderReportCurrencyBucket>();
      let orderCount = 0;
      let paidOrderCount = 0;
      let revenueMinor = 0;
      let commissionMinor = 0;

      for (const row of rows) {
        orderCount += 1;
        const paid = row.paymentStatus === 'PAID';
        if (paid) {
          paidOrderCount += 1;
          revenueMinor += row.totalMinor;
          commissionMinor += row.commissionMinor;
        }
        addCurrency(byCurrency, row.currencyCode, paid, row.totalMinor, row.commissionMinor);
      }

      const { trends, paymentMethods, aovMinor } = computeTrendsAndPaymentMethods(rows);

      return {
        scopeId: vendorId,
        scopeType: 'VENDOR',
        currencies: sortedCurrencies(byCurrency),
        orderCount,
        paidOrderCount,
        revenueMinor,
        commissionMinor,
        aovMinor,
        trends,
        paymentMethods,
      };
    });
  }

  public async getStoreAnalytics(storeId: string, days = 30): Promise<ScopedAnalyticsSummary> {
    return withRlsContext(this.em, async (tx) => {
      const cutoff = new Date(Date.now() - Math.max(1, days) * 24 * 60 * 60 * 1000);
      const rows = await tx.find(
        ReportingOrderFactOrmEntity,
        { storeId, createdAt: { $gte: cutoff } },
        { orderBy: { createdAt: 'ASC' } },
      );

      const byCurrency = new Map<string, OrderReportCurrencyBucket>();
      let orderCount = 0;
      let paidOrderCount = 0;
      let revenueMinor = 0;
      let commissionMinor = 0;

      for (const row of rows) {
        orderCount += 1;
        const paid = row.paymentStatus === 'PAID';
        if (paid) {
          paidOrderCount += 1;
          revenueMinor += row.totalMinor;
          commissionMinor += row.commissionMinor;
        }
        addCurrency(byCurrency, row.currencyCode, paid, row.totalMinor, row.commissionMinor);
      }

      const { trends, paymentMethods, aovMinor } = computeTrendsAndPaymentMethods(rows);

      return {
        scopeId: storeId,
        scopeType: 'STORE',
        currencies: sortedCurrencies(byCurrency),
        orderCount,
        paidOrderCount,
        revenueMinor,
        commissionMinor,
        aovMinor,
        trends,
        paymentMethods,
      };
    });
  }
}
