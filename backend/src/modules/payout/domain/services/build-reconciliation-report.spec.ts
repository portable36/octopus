import { describe, expect, it } from 'vitest';
import { buildReconciliationReport } from './build-reconciliation-report';

describe('buildReconciliationReport', () => {
  const asOf = new Date('2026-08-25T12:00:00.000Z');

  it('flags snapshot drift and orphan payout refs without mutating', () => {
    const report = buildReconciliationReport({
      vendorId: 'v1',
      asOf,
      entries: [
        {
          id: 'e1',
          entryType: 'SALE',
          referenceType: 'ORDER',
          referenceId: 'o1',
          direction: 'CREDIT',
          amountMinor: 1000,
          currencyCode: 'BDT',
          availableAt: new Date('2026-08-01T00:00:00.000Z'),
        },
        {
          id: 'e2',
          entryType: 'PAYOUT',
          referenceType: 'PAYOUT',
          referenceId: 'missing-payout',
          direction: 'DEBIT',
          amountMinor: 100,
          currencyCode: 'BDT',
          availableAt: new Date('2026-08-01T00:00:00.000Z'),
        },
      ],
      snapshot: {
        vendorId: 'v1',
        currencyCode: 'BDT',
        pendingMinor: 0,
        availableMinor: 500,
        rebuiltAt: new Date('2026-08-24T00:00:00.000Z'),
      },
      completedPayoutIds: new Set(),
      completedPayoutsMissingLedger: ['payout-no-ledger'],
    });

    expect(report.balanced).toBe(false);
    expect(report.availableDeltaMinor).toBe(400); // derived 900 vs snapshot 500
    expect(report.orphans).toEqual([
      {
        kind: 'PAYOUT_ENTRY_WITHOUT_PAYOUT',
        referenceId: 'missing-payout',
        entryId: 'e2',
      },
      {
        kind: 'COMPLETED_PAYOUT_WITHOUT_LEDGER',
        referenceId: 'payout-no-ledger',
        entryId: null,
      },
    ]);
  });
});
