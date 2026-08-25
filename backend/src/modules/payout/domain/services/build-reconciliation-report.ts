import type { LedgerDirection, LedgerEntryRecord, VendorBalanceSnapshot } from '../ledger.types';
import { computeVendorBalance } from './compute-vendor-balance';

export type ReconciliationOrphan = {
  readonly kind: 'PAYOUT_ENTRY_WITHOUT_PAYOUT' | 'COMPLETED_PAYOUT_WITHOUT_LEDGER';
  readonly referenceId: string;
  readonly entryId: string | null;
};

export type LedgerReconciliationReport = {
  readonly vendorId: string;
  readonly derived: {
    readonly currencyCode: string;
    readonly pendingMinor: number;
    readonly availableMinor: number;
  };
  readonly snapshot: {
    readonly currencyCode: string;
    readonly pendingMinor: number;
    readonly availableMinor: number;
    readonly rebuiltAt: string;
  } | null;
  readonly balanced: boolean;
  readonly pendingDeltaMinor: number;
  readonly availableDeltaMinor: number;
  readonly orphans: readonly ReconciliationOrphan[];
  readonly checkedAt: string;
};

/**
 * Report-only: compare derived balance to snapshot and surface orphan payout refs.
 * Does not mutate ledger or auto-fix drift.
 */
export function buildReconciliationReport(input: {
  readonly vendorId: string;
  readonly entries: readonly Pick<
    LedgerEntryRecord,
    | 'id'
    | 'entryType'
    | 'referenceType'
    | 'referenceId'
    | 'direction'
    | 'amountMinor'
    | 'currencyCode'
    | 'availableAt'
  >[];
  readonly snapshot: VendorBalanceSnapshot | null;
  readonly completedPayoutIds: ReadonlySet<string>;
  readonly completedPayoutsMissingLedger: readonly string[];
  readonly asOf?: Date;
}): LedgerReconciliationReport {
  const asOf = input.asOf ?? new Date();
  const derived = computeVendorBalance(input.entries, asOf);
  const snapshot = input.snapshot;
  const pendingDeltaMinor = snapshot ? derived.pendingMinor - snapshot.pendingMinor : 0;
  const availableDeltaMinor = snapshot ? derived.availableMinor - snapshot.availableMinor : 0;
  const balanced = snapshot != null && pendingDeltaMinor === 0 && availableDeltaMinor === 0;

  const orphans: ReconciliationOrphan[] = [];
  for (const entry of input.entries) {
    if (entry.entryType !== 'PAYOUT' || entry.referenceType !== 'PAYOUT') {
      continue;
    }
    if (!input.completedPayoutIds.has(entry.referenceId)) {
      orphans.push({
        kind: 'PAYOUT_ENTRY_WITHOUT_PAYOUT',
        referenceId: entry.referenceId,
        entryId: entry.id,
      });
    }
  }
  for (const payoutId of input.completedPayoutsMissingLedger) {
    orphans.push({
      kind: 'COMPLETED_PAYOUT_WITHOUT_LEDGER',
      referenceId: payoutId,
      entryId: null,
    });
  }

  return {
    vendorId: input.vendorId,
    derived: {
      currencyCode: derived.currencyCode,
      pendingMinor: derived.pendingMinor,
      availableMinor: derived.availableMinor,
    },
    snapshot: snapshot
      ? {
          currencyCode: snapshot.currencyCode,
          pendingMinor: snapshot.pendingMinor,
          availableMinor: snapshot.availableMinor,
          rebuiltAt: snapshot.rebuiltAt.toISOString(),
        }
      : null,
    balanced: snapshot == null ? input.entries.length === 0 : balanced,
    pendingDeltaMinor,
    availableDeltaMinor,
    orphans,
    checkedAt: asOf.toISOString(),
  };
}

export type AdjustmentDirection = Extract<LedgerDirection, 'CREDIT' | 'DEBIT'>;
