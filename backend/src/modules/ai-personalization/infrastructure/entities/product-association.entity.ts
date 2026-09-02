import { Entity, Index, PrimaryKey, Property, Unique } from '@mikro-orm/core';

@Entity({ tableName: 'product_associations' })
@Unique({ properties: ['productId', 'associatedProductId'] })
@Index({ properties: ['productId', 'coPurchaseScore'] })
@Index({ properties: ['associatedProductId'] })
export class ProductAssociation {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'product_id', type: 'uuid' })
  @Index()
  productId!: string;

  @Property({ fieldName: 'associated_product_id', type: 'uuid' })
  associatedProductId!: string;

  @Property({ fieldName: 'co_purchase_score', type: 'double' })
  coPurchaseScore!: number;

  @Property({ fieldName: 'updated_at' })
  updatedAt!: Date;
}
