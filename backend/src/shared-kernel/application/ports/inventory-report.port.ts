export const INVENTORY_REPORT = Symbol('INVENTORY_REPORT');

export type InventoryStockAlertRow = {
  readonly storeId: string;
  readonly variantId: string;
  readonly available: number;
  readonly lowStockThreshold: number;
  readonly stockStatus: 'LOW_STOCK' | 'OUT_OF_STOCK';
};

export type InventoryReportSummary = {
  readonly itemCount: number;
  readonly storeCount: number;
  readonly inStockCount: number;
  readonly lowStockCount: number;
  readonly outOfStockCount: number;
  readonly alerts: readonly InventoryStockAlertRow[];
};

export interface InventoryReportPort {
  summarize(alertLimit?: number): Promise<InventoryReportSummary>;
}
