import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type {
  DetailedSalesAnalytics,
  OrderReportCurrencyBucket,
  OrderReportSummary,
  PaymentMethodSummary,
  ProductPerformanceRow,
  RefundReportSummary,
  ReportingOrderFact,
  ReportingOrderFactRepository,
  ReportingOrderItemFact,
  ReportingRefundFact,
  ScopedAnalyticsSummary,
  StorePerformanceRow,
  TrendDataPoint,
  VendorPerformanceRow,
} from '../../application/ports/reporting-order-fact-repository.interface';
import { ReportingOrderFactOrmEntity } from './reporting-order-fact.orm-entity';
import { ReportingOrderItemFactOrmEntity } from './reporting-order-item-fact.orm-entity';
import { ReportingRefundFactOrmEntity } from './reporting-refund-fact.orm-entity';

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

  public async upsertItemFacts(items: readonly ReportingOrderItemFact[]): Promise<void> {
    if (items.length === 0) {
      return;
    }
    await withRlsContext(this.em, async (tx) => {
      for (const item of items) {
        let entity = await tx.findOne(ReportingOrderItemFactOrmEntity, {
          orderId: item.orderId,
          lineId: item.lineId,
        });
        if (!entity) {
          entity = new ReportingOrderItemFactOrmEntity();
          entity.id = item.id;
          entity.orderId = item.orderId;
          entity.lineId = item.lineId;
          entity.createdAt = item.createdAt;
        }
        entity.vendorId = item.vendorId;
        entity.storeId = item.storeId;
        entity.productId = item.productId;
        entity.variantId = item.variantId;
        entity.quantity = item.quantity;
        entity.unitPriceMinor = item.unitPriceMinor;
        entity.totalMinor = item.totalMinor;
        entity.currencyCode = item.currencyCode;
        entity.paymentStatus = item.paymentStatus;
        entity.paidAt =
          item.paymentStatus === 'PAID' ? (entity.paidAt ?? item.paidAt ?? new Date()) : null;
        await tx.persist(entity).flush();
      }
    });
  }

  public async recordRefundFact(refund: ReportingRefundFact): Promise<void> {
    await withRlsContext(this.em, async (tx) => {
      let entity = await tx.findOne(ReportingRefundFactOrmEntity, { refundId: refund.refundId });
      if (!entity) {
        entity = new ReportingRefundFactOrmEntity();
        entity.refundId = refund.refundId;
        entity.createdAt = refund.createdAt;
      }
      entity.orderId = refund.orderId;
      entity.vendorId = refund.vendorId;
      entity.storeId = refund.storeId;
      entity.returnId = refund.returnId;
      entity.amountMinor = refund.amountMinor;
      entity.currencyCode = refund.currencyCode;
      entity.paymentMethod = refund.paymentMethod;
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

  public async getTopProducts(query: {
    vendorId?: string;
    storeId?: string;
    days?: number;
    limit?: number;
  }): Promise<readonly ProductPerformanceRow[]> {
    return withRlsContext(this.em, async (tx) => {
      const days = query.days ?? 30;
      const cutoff = new Date(Date.now() - Math.max(1, days) * 24 * 60 * 60 * 1000);
      const where: Record<string, unknown> = {
        createdAt: { $gte: cutoff },
        paymentStatus: 'PAID',
      };
      if (query.vendorId) {
        where.vendorId = query.vendorId;
      }
      if (query.storeId) {
        where.storeId = query.storeId;
      }

      const rows = await tx.find(ReportingOrderItemFactOrmEntity, where, {
        orderBy: { createdAt: 'DESC' },
      });

      type ProductAcc = {
        productId: string;
        variantId: string;
        unitsSold: number;
        orderIds: Set<string>;
        revenueMinor: number;
        currencyCode: string;
      };

      const map = new Map<string, ProductAcc>();
      for (const row of rows) {
        const key = `${row.productId}::${row.variantId}`;
        const existing = map.get(key) ?? {
          productId: row.productId,
          variantId: row.variantId,
          unitsSold: 0,
          orderIds: new Set<string>(),
          revenueMinor: 0,
          currencyCode: row.currencyCode || 'BDT',
        };
        existing.unitsSold += row.quantity;
        existing.orderIds.add(row.orderId);
        existing.revenueMinor += row.totalMinor;
        map.set(key, existing);
      }

      const capped = Math.min(Math.max(query.limit ?? 10, 1), 100);
      return [...map.values()]
        .map((acc) => ({
          productId: acc.productId,
          variantId: acc.variantId,
          unitsSold: acc.unitsSold,
          orderCount: acc.orderIds.size,
          revenueMinor: acc.revenueMinor,
          currencyCode: acc.currencyCode,
        }))
        .sort((a, b) => b.revenueMinor - a.revenueMinor || b.unitsSold - a.unitsSold)
        .slice(0, capped);
    });
  }

  public async getRefundAnalytics(query: {
    vendorId?: string;
    storeId?: string;
    days?: number;
  }): Promise<RefundReportSummary> {
    return withRlsContext(this.em, async (tx) => {
      const days = query.days ?? 30;
      const cutoff = new Date(Date.now() - Math.max(1, days) * 24 * 60 * 60 * 1000);
      const whereRefund: Record<string, unknown> = {
        createdAt: { $gte: cutoff },
      };
      const whereOrder: Record<string, unknown> = {
        createdAt: { $gte: cutoff },
      };
      if (query.vendorId) {
        whereRefund.vendorId = query.vendorId;
        whereOrder.vendorId = query.vendorId;
      }
      if (query.storeId) {
        whereRefund.storeId = query.storeId;
        whereOrder.storeId = query.storeId;
      }

      const [refunds, orders] = await Promise.all([
        tx.find(ReportingRefundFactOrmEntity, whereRefund, {
          orderBy: { createdAt: 'DESC' },
        }),
        tx.find(ReportingOrderFactOrmEntity, whereOrder),
      ]);

      let totalRefundedMinor = 0;
      let primaryCurrency = 'BDT';
      const byMethod = new Map<string, { refundCount: number; amountMinor: number }>();

      for (const ref of refunds) {
        totalRefundedMinor += ref.amountMinor;
        if (ref.currencyCode) {
          primaryCurrency = ref.currencyCode;
        }
        const method = ref.paymentMethod || 'UNKNOWN';
        const acc = byMethod.get(method) ?? { refundCount: 0, amountMinor: 0 };
        acc.refundCount += 1;
        acc.amountMinor += ref.amountMinor;
        byMethod.set(method, acc);
      }

      let totalPaidRevenueMinor = 0;
      let totalPaidOrders = 0;
      for (const ord of orders) {
        if (ord.paymentStatus === 'PAID') {
          totalPaidOrders += 1;
          totalPaidRevenueMinor += ord.totalMinor;
          primaryCurrency = ord.currencyCode || primaryCurrency;
        }
      }

      const refundRatePercent =
        totalPaidRevenueMinor > 0
          ? Number(((totalRefundedMinor / totalPaidRevenueMinor) * 100).toFixed(2))
          : totalPaidOrders > 0
            ? Number(((refunds.length / totalPaidOrders) * 100).toFixed(2))
            : 0;

      const refundsByMethod = [...byMethod.entries()]
        .map(([paymentMethod, acc]) => ({
          paymentMethod,
          refundCount: acc.refundCount,
          amountMinor: acc.amountMinor,
        }))
        .sort((a, b) => b.amountMinor - a.amountMinor);

      const recentRefunds = refunds.slice(0, 10).map((r) => ({
        refundId: r.refundId,
        orderId: r.orderId,
        vendorId: r.vendorId,
        storeId: r.storeId,
        amountMinor: r.amountMinor,
        currencyCode: r.currencyCode,
        paymentMethod: r.paymentMethod,
        createdAt: (r.createdAt instanceof Date
          ? r.createdAt
          : new Date(r.createdAt)
        ).toISOString(),
      }));

      return {
        totalRefundCount: refunds.length,
        totalRefundedMinor,
        primaryCurrency,
        refundRatePercent,
        refundsByMethod,
        recentRefunds,
      };
    });
  }
}
