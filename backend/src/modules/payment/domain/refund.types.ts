export type RefundStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED';

/** MANUAL = staff-recorded COD cash return; ORIGINAL_PROVIDER = gateway refund API. */
export type RefundMethod = 'MANUAL' | 'ORIGINAL_PROVIDER';

export const REFUND_STATUSES_COUNTING_TOWARD_CAP: readonly RefundStatus[] = [
  'PENDING',
  'SUCCEEDED',
] as const;
