import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  STORE_ACCESS,
  type StoreAccessPort,
} from '../../../../shared-kernel/application/ports/store-access.port';
import {
  VENDOR_ACCESS,
  type VendorAccessPort,
} from '../../../../shared-kernel/application/ports/vendor-access.port';
import {
  REPORTING_ORDER_FACT_REPOSITORY,
  type DetailedSalesAnalytics,
  type OrderReportSummary,
  type ProductPerformanceRow,
  type RefundReportSummary,
  type ReportingOrderFactRepository,
  type ScopedAnalyticsSummary,
  type StorePerformanceRow,
  type VendorPerformanceRow,
} from '../ports/reporting-order-fact-repository.interface';

export class ReportingAccessDeniedError extends Error {
  readonly code = 'REPORTING_ACCESS_DENIED';
  constructor(message = 'Platform admin required to read reports.') {
    super(message);
    this.name = 'ReportingAccessDeniedError';
  }
}

@Injectable()
export class ReportingQueryHandler {
  constructor(
    @Inject(REPORTING_ORDER_FACT_REPOSITORY)
    private readonly facts: ReportingOrderFactRepository,
    @Optional()
    @Inject(VENDOR_ACCESS)
    private readonly vendors?: VendorAccessPort,
    @Optional()
    @Inject(STORE_ACCESS)
    private readonly stores?: StoreAccessPort,
  ) {}

  private requirePlatform(actorRoles: readonly string[]): void {
    if (!actorRoles.includes('PLATFORM_ADMIN')) {
      throw new ReportingAccessDeniedError();
    }
  }

  private async requireVendorAccess(
    vendorId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<void> {
    if (actorRoles.includes('PLATFORM_ADMIN')) {
      return;
    }
    const vendor = await this.vendors?.findById(vendorId);
    if (
      !vendor ||
      (vendor.ownerUserId !== actorUserId && !vendor.staffUserIds.includes(actorUserId))
    ) {
      throw new ReportingAccessDeniedError('Not authorized for this vendor analytics.');
    }
  }

  private async requireStoreAccess(
    storeId: string,
    actorUserId: string,
    actorRoles: readonly string[],
  ): Promise<void> {
    if (actorRoles.includes('PLATFORM_ADMIN')) {
      return;
    }
    const store = await this.stores?.findById(storeId);
    if (!store) {
      throw new ReportingAccessDeniedError('Not authorized for this store analytics.');
    }
    const isStoreStaff =
      store.managerUserIds.includes(actorUserId) || store.staffUserIds.includes(actorUserId);
    if (!isStoreStaff) {
      const vendor = await this.vendors?.findById(store.vendorId);
      const isVendorStaff =
        vendor && (vendor.ownerUserId === actorUserId || vendor.staffUserIds.includes(actorUserId));
      if (!isVendorStaff) {
        throw new ReportingAccessDeniedError('Not authorized for this store analytics.');
      }
    }
  }

  public async orderSummary(actorRoles: readonly string[]): Promise<OrderReportSummary> {
    this.requirePlatform(actorRoles);
    return this.facts.summarizeOrders();
  }

  public async vendorPerformance(
    actorRoles: readonly string[],
  ): Promise<readonly VendorPerformanceRow[]> {
    this.requirePlatform(actorRoles);
    return this.facts.summarizeVendors();
  }

  public async storePerformance(
    actorRoles: readonly string[],
  ): Promise<readonly StorePerformanceRow[]> {
    this.requirePlatform(actorRoles);
    return this.facts.summarizeStores();
  }

  public async salesAnalytics(
    actorRoles: readonly string[],
    days = 30,
  ): Promise<DetailedSalesAnalytics> {
    this.requirePlatform(actorRoles);
    return this.facts.getSalesAnalytics(days);
  }

  public async vendorAnalytics(
    vendorId: string,
    actorUserId: string,
    actorRoles: readonly string[],
    days = 30,
  ): Promise<ScopedAnalyticsSummary> {
    await this.requireVendorAccess(vendorId, actorUserId, actorRoles);
    return this.facts.getVendorAnalytics(vendorId, days);
  }

  public async storeAnalytics(
    storeId: string,
    actorUserId: string,
    actorRoles: readonly string[],
    days = 30,
  ): Promise<ScopedAnalyticsSummary> {
    await this.requireStoreAccess(storeId, actorUserId, actorRoles);
    return this.facts.getStoreAnalytics(storeId, days);
  }

  public async topProducts(
    actorRoles: readonly string[],
    days = 30,
    limit = 10,
  ): Promise<readonly ProductPerformanceRow[]> {
    this.requirePlatform(actorRoles);
    return this.facts.getTopProducts({ days, limit });
  }

  public async vendorTopProducts(
    vendorId: string,
    actorUserId: string,
    actorRoles: readonly string[],
    days = 30,
    limit = 10,
  ): Promise<readonly ProductPerformanceRow[]> {
    await this.requireVendorAccess(vendorId, actorUserId, actorRoles);
    return this.facts.getTopProducts({ vendorId, days, limit });
  }

  public async storeTopProducts(
    storeId: string,
    actorUserId: string,
    actorRoles: readonly string[],
    days = 30,
    limit = 10,
  ): Promise<readonly ProductPerformanceRow[]> {
    await this.requireStoreAccess(storeId, actorUserId, actorRoles);
    return this.facts.getTopProducts({ storeId, days, limit });
  }

  public async refundAnalytics(
    actorRoles: readonly string[],
    days = 30,
  ): Promise<RefundReportSummary> {
    this.requirePlatform(actorRoles);
    return this.facts.getRefundAnalytics({ days });
  }

  public async vendorRefundAnalytics(
    vendorId: string,
    actorUserId: string,
    actorRoles: readonly string[],
    days = 30,
  ): Promise<RefundReportSummary> {
    await this.requireVendorAccess(vendorId, actorUserId, actorRoles);
    return this.facts.getRefundAnalytics({ vendorId, days });
  }

  public async storeRefundAnalytics(
    storeId: string,
    actorUserId: string,
    actorRoles: readonly string[],
    days = 30,
  ): Promise<RefundReportSummary> {
    await this.requireStoreAccess(storeId, actorUserId, actorRoles);
    return this.facts.getRefundAnalytics({ storeId, days });
  }
}
