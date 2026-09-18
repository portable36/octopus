export const PAYOUT_REPORT = Symbol('PAYOUT_REPORT');

export type PayoutReportStatusBucket = {
  readonly status: string;
  readonly count: number;
  readonly amountMinor: number;
};

export type PayoutReportCurrencyBucket = {
  readonly currencyCode: string;
  readonly count: number;
  readonly amountMinor: number;
  readonly completedMinor: number;
  readonly reservedMinor: number;
};

export type PayoutReportSummary = {
  readonly days: number;
  readonly payoutCount: number;
  readonly byStatus: readonly PayoutReportStatusBucket[];
  readonly byCurrency: readonly PayoutReportCurrencyBucket[];
};

export interface PayoutReportPort {
  summarize(days?: number): Promise<PayoutReportSummary>;
}
