/** Remaining refundable amount in minor units (never negative). */
export function computeMaxRefundable(input: {
  readonly capturedAmountMinor: number;
  readonly refundedOrPendingMinor: number;
}): number {
  const remaining = input.capturedAmountMinor - input.refundedOrPendingMinor;
  return remaining > 0 ? remaining : 0;
}
