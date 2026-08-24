import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import type { StoreOfferStatus } from '../../domain/catalog.types';

@Entity({ tableName: 'catalog_store_offers' })
@Unique({ properties: ['storeId', 'variantId'] })
export class StoreOfferOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'vendor_id', type: 'uuid' })
  vendorId!: string;

  @Property({ fieldName: 'store_id', type: 'uuid' })
  storeId!: string;

  @Property({ fieldName: 'product_id', type: 'uuid' })
  productId!: string;

  @Property({ fieldName: 'variant_id', type: 'uuid' })
  variantId!: string;

  @Property({ fieldName: 'price_minor' })
  priceMinor!: number;

  @Property({ fieldName: 'currency_code' })
  currencyCode!: string;

  @Property()
  status!: StoreOfferStatus;

  @Property({ fieldName: 'is_available' })
  isAvailable!: boolean;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'updated_at', onUpdate: () => new Date() })
  updatedAt!: Date;
}
