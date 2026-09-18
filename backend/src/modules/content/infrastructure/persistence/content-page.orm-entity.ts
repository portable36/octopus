import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import type { ContentBlock, ContentPageSeo } from '../../domain/content.types';

@Entity({ tableName: 'content_pages' })
export class ContentPageOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ length: 200 })
  title!: string;

  @Property({ length: 200 })
  slug!: string;

  @Property({ length: 32 })
  status!: string;

  @Property({ fieldName: 'draft_body', type: 'json' })
  draftBody: ContentBlock[] = [];

  @Property({ fieldName: 'draft_seo', type: 'json' })
  draftSeo: ContentPageSeo = {};

  @Property({ type: 'integer' })
  version!: number;

  @Property({ fieldName: 'current_publication_id', type: 'uuid', nullable: true })
  currentPublicationId: string | null = null;

  @Property({ fieldName: 'archived_at', nullable: true })
  archivedAt: Date | null = null;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'updated_at' })
  updatedAt!: Date;

  @Property({ fieldName: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null = null;

  @Property({ fieldName: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null = null;
}
