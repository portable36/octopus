import { Migration } from '@mikro-orm/migrations';

/** High-rank SEO — crawl error logs and operational health issue projections. */
export class Migration20260902120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "crawl_error_logs" (
        "id" uuid not null,
        "request_path" varchar(2048) not null,
        "http_method" varchar(16) not null default 'GET',
        "user_agent" varchar(512) null,
        "occurred_at" timestamptz not null,
        constraint "crawl_error_logs_pkey" primary key ("id")
      );
    `);
    this.addSql(`
      create index if not exists "crawl_error_logs_request_path_idx"
        on "crawl_error_logs" ("request_path");
    `);
    this.addSql(`
      create index if not exists "crawl_error_logs_occurred_at_idx"
        on "crawl_error_logs" ("occurred_at" desc);
    `);
    this.addSql(`
      create table if not exists "seo_health_issues" (
        "id" uuid not null,
        "url" varchar(2048) not null,
        "issue_type" varchar(64) not null,
        "severity" varchar(16) not null default 'warning',
        "detail" text not null,
        "scanned_at" timestamptz not null,
        constraint "seo_health_issues_pkey" primary key ("id"),
        constraint "seo_health_issues_severity_chk"
          check ("severity" in ('warning', 'error'))
      );
    `);
    this.addSql(`
      create index if not exists "seo_health_issues_url_idx"
        on "seo_health_issues" ("url");
    `);
    this.addSql(`
      create index if not exists "seo_health_issues_scanned_at_idx"
        on "seo_health_issues" ("scanned_at" desc);
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "seo_health_issues";`);
    this.addSql(`drop table if exists "crawl_error_logs";`);
  }
}
