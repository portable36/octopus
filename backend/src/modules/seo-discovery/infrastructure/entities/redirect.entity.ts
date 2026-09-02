import { Entity, Index, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import type { RedirectStatusCode } from '../../domain/seo.types';

@Entity({ tableName: 'seo_redirects' })
@Unique({ properties: ['sourceUrl'] })
export class Redirect {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'source_path', length: 2048 })
  @Index()
  sourceUrl!: string;

  @Property({ fieldName: 'target_path', length: 2048, nullable: true })
  targetUrl: string | null = null;

  @Property({ fieldName: 'status_code', type: 'smallint' })
  statusCode!: RedirectStatusCode;

  @Property({ fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ fieldName: 'updated_at', onUpdate: () => new Date() })
  updatedAt!: Date;
}
