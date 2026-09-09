import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'customer_wishlist_items' })
export class CustomerWishlistItemOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'user_id', type: 'uuid' })
  userId!: string;

  @Property({ fieldName: 'product_id', type: 'uuid' })
  productId!: string;

  @Property({ fieldName: 'variant_id', type: 'uuid', nullable: true })
  variantId: string | null = null;

  @Property({ fieldName: 'store_id', type: 'uuid', nullable: true })
  storeId: string | null = null;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;
}

@Entity({ tableName: 'product_reviews' })
export class ProductReviewOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'product_id', type: 'uuid' })
  productId!: string;

  @Property({ fieldName: 'user_id', type: 'uuid' })
  userId!: string;

  @Property({ fieldName: 'order_id', type: 'uuid', nullable: true })
  orderId: string | null = null;

  @Property({ type: 'smallint' })
  rating!: number;

  @Property()
  title!: string;

  @Property({ type: 'text' })
  body!: string;

  @Property()
  status!: 'PENDING' | 'PUBLISHED' | 'REJECTED';

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'updated_at', onUpdate: () => new Date() })
  updatedAt!: Date;
}
