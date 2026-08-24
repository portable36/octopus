import type { ReceiptTemplate } from '../../domain/aggregates/receipt-template.aggregate';

export const RECEIPT_TEMPLATE_REPOSITORY = Symbol('RECEIPT_TEMPLATE_REPOSITORY');

export interface ReceiptTemplateRepository {
  save(template: ReceiptTemplate): Promise<void>;
  findByStoreId(storeId: string): Promise<ReceiptTemplate | null>;
  findById(id: string): Promise<ReceiptTemplate | null>;
}
