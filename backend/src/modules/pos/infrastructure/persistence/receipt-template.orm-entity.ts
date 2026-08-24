import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import type { ReceiptPaperWidth } from '../../domain/receipt.types';

@Entity({ tableName: 'pos_receipt_templates' })
@Unique({ properties: ['storeId'] })
export class ReceiptTemplateOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'store_id', type: 'uuid' })
  storeId!: string;

  @Property({ fieldName: 'vendor_id', type: 'uuid' })
  vendorId!: string;

  @Property({ fieldName: 'display_name' })
  displayName!: string;

  @Property({ fieldName: 'address_lines', type: 'json' })
  addressLines: string[] = [];

  @Property({ type: 'varchar', length: 40, nullable: true })
  phone: string | null = null;

  @Property({ type: 'varchar', length: 120, nullable: true })
  website: string | null = null;

  @Property({ fieldName: 'header_lines', type: 'json' })
  headerLines: string[] = [];

  @Property({ fieldName: 'footer_lines', type: 'json' })
  footerLines: string[] = [];

  @Property({ fieldName: 'thank_you_text', type: 'text' })
  thankYouText!: string;

  @Property({ fieldName: 'returns_policy_text', type: 'text' })
  returnsPolicyText!: string;

  @Property({ fieldName: 'show_sku', default: false })
  showSku!: boolean;

  @Property({ fieldName: 'show_tax', default: false })
  showTax!: boolean;

  @Property({ fieldName: 'paper_width' })
  paperWidth!: ReceiptPaperWidth;

  @Property()
  locale!: string;

  @Property({ fieldName: 'currency_code' })
  currencyCode!: string;

  @Property({ fieldName: 'logo_media_id', type: 'varchar', length: 64, nullable: true })
  logoMediaId: string | null = null;

  @Property()
  version!: number;

  @Property({ fieldName: 'updated_at' })
  updatedAt!: Date;

  @Property({ fieldName: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null = null;
}
