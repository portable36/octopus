import type { LedgerEntryRecord, VendorBalanceSnapshot } from '../../domain/ledger.types';

export const LEDGER_REPOSITORY = Symbol('LEDGER_REPOSITORY');

export type LedgerEntryPageFilter = {
  readonly from?: Date;
  readonly to?: Date;
};

export interface LedgerRepository {
  findEntryByIdempotencyKey(idempotencyKey: string): Promise<LedgerEntryRecord | null>;
  appendEntry(entry: LedgerEntryRecord): Promise<void>;
  listEntriesByVendorId(vendorId: string): Promise<readonly LedgerEntryRecord[]>;
  listEntriesByVendorIdPaged(
    vendorId: string,
    limit: number,
    offset: number,
    filter?: LedgerEntryPageFilter,
  ): Promise<readonly LedgerEntryRecord[]>;
  countEntriesByVendorId(vendorId: string, filter?: LedgerEntryPageFilter): Promise<number>;
  saveBalance(snapshot: VendorBalanceSnapshot): Promise<void>;
  findBalance(vendorId: string): Promise<VendorBalanceSnapshot | null>;
  appendOutbox(input: {
    readonly aggregateId: string;
    readonly eventType: string;
    readonly payload: Record<string, unknown>;
  }): Promise<void>;
  withTransaction<T>(work: (repo: LedgerRepository) => Promise<T>): Promise<T>;
}
