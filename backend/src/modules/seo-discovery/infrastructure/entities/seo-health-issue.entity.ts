import { Entity, Index, PrimaryKey, Property } from '@mikro-orm/core';
import type { SeoHealthIssueType } from '../../domain/analyze-page-seo-health';

@Entity({ tableName: 'seo_health_issues' })
export class SeoHealthIssue {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ length: 2048 })
  @Index()
  url!: string;

  @Property({ fieldName: 'issue_type', length: 64 })
  issueType!: SeoHealthIssueType;

  @Property({ length: 16 })
  severity: 'warning' | 'error' = 'warning';

  @Property({ type: 'text' })
  detail!: string;

  @Property({ fieldName: 'scanned_at' })
  @Index()
  scannedAt: Date = new Date();
}
