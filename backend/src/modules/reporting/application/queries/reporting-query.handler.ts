import { Inject, Injectable } from '@nestjs/common';
import {
  REPORTING_ORDER_FACT_REPOSITORY,
  type OrderReportSummary,
  type ReportingOrderFactRepository,
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
  ) {}

  private requirePlatform(actorRoles: readonly string[]): void {
    if (!actorRoles.includes('PLATFORM_ADMIN')) {
      throw new ReportingAccessDeniedError();
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
}
