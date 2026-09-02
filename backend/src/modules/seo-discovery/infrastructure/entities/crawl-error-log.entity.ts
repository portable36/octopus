import { Entity, Index, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'crawl_error_logs' })
export class CrawlErrorLog {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'request_path', length: 2048 })
  @Index()
  requestPath!: string;

  @Property({ fieldName: 'http_method', length: 16 })
  httpMethod = 'GET';

  @Property({ fieldName: 'user_agent', length: 512, nullable: true })
  userAgent: string | null = null;

  @Property({ fieldName: 'occurred_at' })
  @Index()
  occurredAt: Date = new Date();
}
