import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import type { VariantStatus } from '../../domain/aggregates/variant.aggregate';

@Entity({ tableName: 'catalog_variants' })
@Unique({ properties: ['vendorId', 'sku'] })
export class VariantOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'vendor_id', type: 'uuid' })
  vendorId!: string;

  @Property({ fieldName: 'product_id', type: 'uuid' })
  productId!: string;

  @Property()
  sku!: string;

  @Property()
  name!: string;

  @Property({ nullable: true })
  barcode: string | null = null;

  @Property({ nullable: true })
  gtin: string | null = null;

  @Property({ nullable: true })
  ean: string | null = null;

  @Property({ nullable: true })
  upc: string | null = null;

  @Property({ nullable: true })
  mpn: string | null = null;

  @Property({ fieldName: 'manufacturer_reference', nullable: true })
  manufacturerReference: string | null = null;

  @Property({ fieldName: 'cost_price_minor', nullable: true })
  costPriceMinor: number | null = null;

  @Property({ fieldName: 'base_price_minor', nullable: true })
  basePriceMinor: number | null = null;

  @Property({ fieldName: 'compare_at_price_minor', nullable: true })
  compareAtPriceMinor: number | null = null;

  @Property({ fieldName: 'currency_code', nullable: true })
  currencyCode: string | null = null;

  @Property()
  status!: VariantStatus;

  @Property({ type: 'json' })
  attributes: unknown[] = [];

  @Property({ type: 'json' })
  media: unknown[] = [];

  @Property({ fieldName: 'external_references', type: 'json' })
  externalReferences: unknown[] = [];

  @Property({ fieldName: 'tax_classification_reference', nullable: true })
  taxClassificationReference: string | null = null;

  @Property({ fieldName: 'shipping_classification_reference', nullable: true })
  shippingClassificationReference: string | null = null;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'updated_at', onUpdate: () => new Date() })
  updatedAt!: Date;
}
