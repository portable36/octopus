import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import type { ReceiptSaleSnapshot, ReceiptStatus } from '../../domain/receipt.types';

@Entity({ tableName: 'pos_receipts' })
@Unique({ properties: ['storeId', 'receiptNumber'] })
export class ReceiptOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'store_id', type: 'uuid' })
  storeId!: string;

  @Property({ fieldName: 'vendor_id', type: 'uuid' })
  vendorId!: string;

  @Property({ fieldName: 'sale_id', type: 'uuid' })
  saleId!: string;

  @Property({ fieldName: 'receipt_number' })
  receiptNumber!: string;

  @Property({ fieldName: 'template_id', type: 'uuid' })
  templateId!: string;

  @Property({ fieldName: 'template_version_used' })
  templateVersionUsed!: number;

  @Property({ type: 'json' })
  snapshot!: ReceiptSaleSnapshot;

  @Property({ fieldName: 'rendered_text', type: 'text' })
  renderedText!: string;

  @Property()
  status!: ReceiptStatus;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'created_by', type: 'uuid' })
  createdBy!: string;
}
