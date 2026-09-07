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

export type TrendDataPoint = {
  readonly date: string;
  readonly orderCount: number;
  readonly paidOrderCount: number;
  readonly revenueMinor: number;
  readonly commissionMinor: number;
  readonly aovMinor: number;
};

export type PaymentMethodSummary = {
  readonly paymentMethod: string;
  readonly orderCount: number;
  readonly paidOrderCount: number;
  readonly revenueMinor: number;
};

export type DetailedSalesAnalytics = {
  readonly summary: OrderReportSummary;
  readonly aovMinor: number;
  readonly trends: readonly TrendDataPoint[];
  readonly paymentMethods: readonly PaymentMethodSummary[];
};

export type ScopedAnalyticsSummary = {
  readonly scopeId: string;
  readonly scopeType: 'VENDOR' | 'STORE';
  readonly currencies: readonly ScopeReportCurrencyBucket[];
  readonly orderCount: number;
  readonly paidOrderCount: number;
  readonly revenueMinor: number;
  readonly commissionMinor: number;
  readonly aovMinor: number;
  readonly trends: readonly TrendDataPoint[];
  readonly paymentMethods: readonly PaymentMethodSummary[];
};

export type ReportingOrderItemFact = {
  readonly id: string;
  readonly orderId: string;
  readonly lineId: string;
  readonly vendorId: string;
  readonly storeId: string;
  readonly productId: string;
  readonly variantId: string;
  readonly quantity: number;
  readonly unitPriceMinor: number;
  readonly totalMinor: number;
  readonly currencyCode: string;
  readonly paymentStatus: string;
  readonly createdAt: Date;
  readonly paidAt: Date | null;
};

export type ReportingRefundFact = {
  readonly refundId: string;
  readonly orderId: string;
  readonly vendorId: string;
  readonly storeId: string;
  readonly returnId: string | null;
  readonly amountMinor: number;
  readonly currencyCode: string;
  readonly paymentMethod: string | null;
  readonly createdAt: Date;
};

export type ProductPerformanceRow = {
  readonly productId: string;
  readonly variantId: string;
  readonly unitsSold: number;
  readonly orderCount: number;
  readonly revenueMinor: number;
  readonly currencyCode: string;
};

export type RefundReportSummary = {
  readonly totalRefundCount: number;
  readonly totalRefundedMinor: number;
  readonly primaryCurrency: string;
  readonly refundRatePercent: number;
  readonly refundsByMethod: readonly {
    readonly paymentMethod: string;
    readonly refundCount: number;
    readonly amountMinor: number;
  }[];
  readonly recentRefunds: readonly {
    readonly refundId: string;
    readonly orderId: string;
    readonly vendorId: string;
    readonly storeId: string;
    readonly amountMinor: number;
    readonly currencyCode: string;
    readonly paymentMethod: string | null;
    readonly createdAt: string;
  }[];
};

export const REPORTING_ORDER_FACT_REPOSITORY = Symbol('REPORTING_ORDER_FACT_REPOSITORY');

export interface ReportingOrderFactRepository {
  upsert(fact: ReportingOrderFact): Promise<void>;
  upsertItemFacts(items: readonly ReportingOrderItemFact[]): Promise<void>;
  recordRefundFact(refund: ReportingRefundFact): Promise<void>;
  summarizeOrders(): Promise<OrderReportSummary>;
  summarizeVendors(): Promise<readonly VendorPerformanceRow[]>;
  summarizeStores(): Promise<readonly StorePerformanceRow[]>;
  getSalesAnalytics(days?: number): Promise<DetailedSalesAnalytics>;
  getVendorAnalytics(vendorId: string, days?: number): Promise<ScopedAnalyticsSummary>;
  getStoreAnalytics(storeId: string, days?: number): Promise<ScopedAnalyticsSummary>;
  getTopProducts(query: {
    vendorId?: string;
    storeId?: string;
    days?: number;
    limit?: number;
  }): Promise<readonly ProductPerformanceRow[]>;
  getRefundAnalytics(query: {
    vendorId?: string;
    storeId?: string;
    days?: number;
  }): Promise<RefundReportSummary>;
}
