import type { VendorPayout } from '../../domain/aggregates/vendor-payout.aggregate';

export const PAYOUT_REPOSITORY = Symbol('PAYOUT_REPOSITORY');

export interface PayoutRepository {
  findById(id: string): Promise<VendorPayout | null>;
  findByIdempotencyKey(idempotencyKey: string): Promise<VendorPayout | null>;
  listByVendorId(vendorId: string, limit: number, offset: number): Promise<readonly VendorPayout[]>;
  /** Sum of amounts for in-flight (reserving) payouts for a vendor. */
  sumReservedMinor(vendorId: string, excludePayoutId?: string): Promise<number>;
  /** Completed payouts for reconciliation orphan checks. */
  listCompletedForVendor(vendorId: string): Promise<
    readonly {
      readonly id: string;
      readonly ledgerEntryId: string | null;
    }[]
  >;
  /** Pessimistic lock on vendor_ledger_balances row (creates zero row if missing). */
  lockVendorBalance(vendorId: string, currencyCode: string): Promise<void>;
  /** Ledger availableMinor derived from entries (call after lockVendorBalance). */
  computeAvailableMinor(vendorId: string): Promise<number>;
  save(payout: VendorPayout): Promise<void>;
  appendOutbox(input: {
    readonly aggregateId: string;
    readonly eventType: string;
    readonly payload: Record<string, unknown>;
  }): Promise<void>;
  withTransaction<T>(work: (repo: PayoutRepository) => Promise<T>): Promise<T>;
}
