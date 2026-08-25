export const LEDGER_PORT = Symbol('LEDGER_PORT');

/**
 * Refund allocation shape carried on Payment `RefundCompleted` outbox payloads.
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
  readonly commissionReversalMinor: number | null;
};

export type LedgerSaleRecognitionInput = {
  readonly orderId: string;
  readonly paymentIntentId?: string | null;
  readonly actorUserId?: string | null;
};

export type VendorLedgerBalanceDto = {
  readonly vendorId: string;
  readonly currencyCode: string;
  readonly pendingMinor: number;
  readonly availableMinor: number;
  readonly rebuiltAt: string;
};

export type VendorLedgerEntryDto = {
  readonly id: string;
  readonly entryType: string;
  readonly direction: string;
  readonly amountMinor: number;
  readonly currencyCode: string;
  readonly orderId: string | null;
  readonly referenceType: string;
  readonly referenceId: string;
  readonly availableAt: string;
  readonly occurredAt: string;
};

export interface LedgerPort {
  /** Idempotent SALE + COMMISSION from order pricing snapshot when payment is PAID. */
  recordSaleRecognition(input: LedgerSaleRecognitionInput): Promise<void>;
  /** Idempotent DEBIT REFUND (+ optional commission credit later). */
  recordRefundAllocation(input: LedgerRefundAllocation): Promise<void>;
  rebuildVendorBalance(vendorId: string): Promise<VendorLedgerBalanceDto>;
  getVendorBalance(vendorId: string): Promise<VendorLedgerBalanceDto | null>;
  listVendorEntries(
    vendorId: string,
    limit: number,
    offset: number,
  ): Promise<readonly VendorLedgerEntryDto[]>;
}
