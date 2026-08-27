import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { withRlsContext } from '../../../../shared-kernel/infrastructure/persistence/rls-session';
import type {
  OrderReportCurrencyBucket,
  OrderReportSummary,
  ReportingOrderFact,
  ReportingOrderFactRepository,
  StorePerformanceRow,
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
}
