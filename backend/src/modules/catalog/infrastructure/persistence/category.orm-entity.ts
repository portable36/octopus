import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import type { CategoryStatus } from '../../domain/catalog.types';

@Entity({ tableName: 'catalog_categories' })
export class CategoryOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property()
  name!: string;

  @Property()
  slug!: string;

  @Property({ fieldName: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null = null;

  @Property()
  status!: CategoryStatus;

  @Property({ fieldName: 'sort_order' })
  sortOrder!: number;

  @Property({ fieldName: 'seo_title', nullable: true })
  seoTitle: string | null = null;

  @Property({ fieldName: 'seo_description', type: 'text', nullable: true })
  seoDescription: string | null = null;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'updated_at', onUpdate: () => new Date() })
  updatedAt!: Date;
}
