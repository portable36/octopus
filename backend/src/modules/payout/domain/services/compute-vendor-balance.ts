import { signedAmount, type LedgerDirection, type LedgerEntryRecord } from '../ledger.types';

export type ComputedVendorBalance = {
  readonly currencyCode: string;
  readonly pendingMinor: number;
  readonly availableMinor: number;
};

/**
 * Rebuild pending/available from append-only entries.
 * Available = sum of signed amounts where availableAt <= asOf.
 * Pending = sum of signed amounts where availableAt > asOf (credits waiting; debits already available reduce available).
 *
 * For simplicity: both buckets use signed sums clamped at 0 for display snapshot fields.
 * Net worth = pending + available (after clamp of each non-negative display).
 */
export function computeVendorBalance(
  entries: readonly Pick<
    LedgerEntryRecord,
    'direction' | 'amountMinor' | 'currencyCode' | 'availableAt'
  >[],
  asOf: Date,
): ComputedVendorBalance {
  if (entries.length === 0) {
    return { currencyCode: 'BDT', pendingMinor: 0, availableMinor: 0 };
  }
  const currencyCode = entries[0]!.currencyCode;
  let pending = 0;
  let available = 0;
  for (const entry of entries) {
    const signed = signedAmount(entry.direction as LedgerDirection, entry.amountMinor);
    if (entry.availableAt.getTime() <= asOf.getTime()) {
      available += signed;
    } else {
      pending += signed;
    }
  }
  return {
    currencyCode,
    pendingMinor: Math.max(0, pending),
    availableMinor: Math.max(0, available),
  };
}

/** Merchandise sale credit from order pricing snapshot (never reprice). */
export function saleAmountFromOrder(input: {
  readonly subtotalMinor: number;
  readonly discountMinor: number;
}): number {
  const sale = input.subtotalMinor - input.discountMinor;
  return sale > 0 ? sale : 0;
}
