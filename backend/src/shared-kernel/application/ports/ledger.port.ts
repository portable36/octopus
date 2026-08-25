export const LEDGER_PORT = Symbol('LEDGER_PORT');

/**
 * Refund allocation shape carried on Payment `RefundCompleted` outbox payloads
 * and consumed by Vendor Finance (Phase 15 persists; Phase 14.4 stub only).
 */
export type LedgerRefundAllocation = {
  readonly entryType: 'REFUND';
  readonly refundId: string;
  readonly paymentIntentId: string;
  readonly orderId: string;
  readonly vendorId: string;
  readonly storeId: string;
  readonly returnId: string | null;
  readonly amountMinor: number;
  readonly currencyCode: string;
  readonly method: string;
  readonly referenceType: 'REFUND';
  readonly referenceId: string;
  readonly idempotencyKey: string;
  /**
   * Proportional commission clawback — filled when sale/commission snapshots exist (15.4).
   * Stub must not invent commission math.
   */
  readonly commissionReversalMinor: number | null;
};

export interface LedgerPort {
  /** Idempotent DEBIT REFUND (+ optional commission credit later). No duplicate posts. */
  recordRefundAllocation(input: LedgerRefundAllocation): Promise<void>;
}
