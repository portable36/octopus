import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import type { ProductStatus } from '../../domain/catalog.types';

@Entity({ tableName: 'catalog_products' })
@Unique({ properties: ['vendorId', 'sku'] })
export class ProductOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'vendor_id', type: 'uuid' })
  vendorId!: string;

  @Property()
  sku!: string;

  @Property()
  name!: string;

  @Property({ type: 'text', nullable: true })
  description: string | null = null;

  @Property({ fieldName: 'brand_id', type: 'uuid', nullable: true })
  brandId: string | null = null;

  @Property({ fieldName: 'category_ids', type: 'json' })
  categoryIds: string[] = [];

  @Property()
  status!: ProductStatus;

  @Property({ type: 'json' })
  attributes: unknown[] = [];

  @Property({ type: 'json' })
  media: unknown[] = [];

  @Property({ fieldName: 'variant_ids', type: 'json' })
  variantIds: string[] = [];

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'updated_at', onUpdate: () => new Date() })
  updatedAt!: Date;
}
