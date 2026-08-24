import type { Receipt } from '../../domain/aggregates/receipt.aggregate';

export const RECEIPT_REPOSITORY = Symbol('RECEIPT_REPOSITORY');

export interface ReceiptRepository {
  save(receipt: Receipt): Promise<void>;
  findById(id: string): Promise<Receipt | null>;
  findByStoreAndSaleId(storeId: string, saleId: string): Promise<Receipt | null>;
  /** Atomically allocates the next daily sequence for the store (UTC day). */
  allocateReceiptNumber(storeId: string, soldAt: Date): Promise<string>;
}
