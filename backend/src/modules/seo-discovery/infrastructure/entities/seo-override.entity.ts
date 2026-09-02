import { Entity, Index, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import type { SeoOverrideEntityType } from '../../domain/seo-override.types';

@Entity({ tableName: 'seo_overrides' })
@Index({ properties: ['entityType', 'entityId'] })
@Unique({ properties: ['entityType', 'entityId'] })
export class SeoOverride {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'entity_type', length: 32 })
  entityType!: SeoOverrideEntityType;

  @Property({ fieldName: 'entity_id', type: 'uuid' })
  entityId!: string;

  @Property({ length: 512, nullable: true })
  title: string | null = null;

  @Property({ type: 'text', nullable: true })
  description: string | null = null;

  @Property({ nullable: true })
  noindex: boolean | null = null;

  @Property({ fieldName: 'canonical_url', length: 2048, nullable: true })
  canonicalUrl: string | null = null;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'updated_at', onUpdate: () => new Date() })
  updatedAt!: Date;
}
