export type LedgerEntryType = 'SALE' | 'COMMISSION' | 'REFUND' | 'ADJUSTMENT' | 'PAYOUT';

export type LedgerDirection = 'CREDIT' | 'DEBIT';

export type LedgerReferenceType = 'ORDER' | 'REFUND' | 'PAYOUT' | 'ADJUSTMENT' | 'SYSTEM';

export type LedgerEntryRecord = {
  readonly id: string;
  readonly vendorId: string;
  readonly storeId: string;
  readonly entryType: LedgerEntryType;
  readonly direction: LedgerDirection;
  readonly amountMinor: number;
  readonly currencyCode: string;
  readonly orderId: string | null;
  readonly referenceType: LedgerReferenceType;
  readonly referenceId: string;
  readonly idempotencyKey: string;
  readonly availableAt: Date;
  readonly occurredAt: Date;
  readonly createdAt: Date;
  readonly metadata: Record<string, unknown> | null;
};

export type VendorBalanceSnapshot = {
  readonly vendorId: string;
  readonly currencyCode: string;
  readonly pendingMinor: number;
  readonly availableMinor: number;
  readonly rebuiltAt: Date;
};

/** Signed contribution: CREDIT +, DEBIT − */
export function signedAmount(direction: LedgerDirection, amountMinor: number): number {
  return direction === 'CREDIT' ? amountMinor : -amountMinor;
}
