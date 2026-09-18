import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import type { ContentBlock, ContentPageSeo } from '../../domain/content.types';

@Entity({ tableName: 'content_page_publications' })
export class ContentPagePublicationOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'page_id', type: 'uuid' })
  pageId!: string;

  @Property({ length: 200 })
  title!: string;

  @Property({ length: 200 })
  slug!: string;

  @Property({ type: 'json' })
  body: ContentBlock[] = [];

  @Property({ type: 'json' })
  seo: ContentPageSeo = {};

  @Property({ fieldName: 'page_version', type: 'integer' })
  pageVersion!: number;

  @Property({ fieldName: 'published_at' })
  publishedAt!: Date;

  @Property({ fieldName: 'published_by', type: 'uuid', nullable: true })
  publishedBy: string | null = null;

  @Property({ fieldName: 'source_publication_id', type: 'uuid', nullable: true })
  sourcePublicationId: string | null = null;
}
