export type PayoutStatus =
  'REQUESTED' | 'UNDER_REVIEW' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REJECTED';

/** Amounts in these statuses reserve available balance until terminal. */
export const PAYOUT_RESERVING_STATUSES: readonly PayoutStatus[] = [
  'REQUESTED',
  'UNDER_REVIEW',
  'APPROVED',
  'PROCESSING',
] as const;
