/**
 * Proportional commission clawback for a refund.
 * Uses order snapshot commission + total — never reprices.
 * # ponytail: floor division; final-refund remainder clawback if penny drift matters
 */
export function proportionalCommissionReversal(input: {
  readonly commissionMinor: number;
  readonly refundAmountMinor: number;
  readonly orderTotalMinor: number;
}): number {
  if (
    !Number.isInteger(input.commissionMinor) ||
    !Number.isInteger(input.refundAmountMinor) ||
    !Number.isInteger(input.orderTotalMinor) ||
    input.commissionMinor < 1 ||
    input.refundAmountMinor < 1 ||
    input.orderTotalMinor < 1
  ) {
    return 0;
  }
  return Math.floor((input.commissionMinor * input.refundAmountMinor) / input.orderTotalMinor);
}
