export type ReportingOrderFact = {
  readonly orderId: string;
  readonly vendorId: string;
  readonly storeId: string;
  readonly customerId: string | null;
  readonly currencyCode: string;
  readonly totalMinor: number;
  readonly commissionMinor: number;
  readonly status: string;
  readonly paymentStatus: string;
  readonly paymentMethod: string;
  readonly createdAt: Date;
  readonly paidAt: Date | null;
  readonly updatedAt: Date;
};

export type OrderReportCurrencyBucket = {
  readonly currencyCode: string;
  readonly orderCount: number;
  readonly paidOrderCount: number;
  readonly revenueMinor: number;
  readonly commissionMinor: number;
};

export type OrderReportSummary = {
  readonly currencies: readonly OrderReportCurrencyBucket[];
  readonly orderCount: number;
  readonly paidOrderCount: number;
};

export type ScopeReportCurrencyBucket = OrderReportCurrencyBucket;

export type VendorPerformanceRow = {
  readonly vendorId: string;
  readonly currencies: readonly ScopeReportCurrencyBucket[];
  readonly orderCount: number;
  readonly paidOrderCount: number;
  readonly revenueMinor: number;
  readonly commissionMinor: number;
};

export type StorePerformanceRow = {
  readonly storeId: string;
  readonly vendorId: string;
  readonly currencies: readonly ScopeReportCurrencyBucket[];
  readonly orderCount: number;
  readonly paidOrderCount: number;
  readonly revenueMinor: number;
  readonly commissionMinor: number;
};

export const REPORTING_ORDER_FACT_REPOSITORY = Symbol('REPORTING_ORDER_FACT_REPOSITORY');

export interface ReportingOrderFactRepository {
  upsert(fact: ReportingOrderFact): Promise<void>;
  summarizeOrders(): Promise<OrderReportSummary>;
  summarizeVendors(): Promise<readonly VendorPerformanceRow[]>;
  summarizeStores(): Promise<readonly StorePerformanceRow[]>;
}
