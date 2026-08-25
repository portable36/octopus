import { Migration } from '@mikro-orm/migrations';

export class Migration20250824360000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "catalog_outbox" (
        "id" uuid primary key,
        "aggregate_id" uuid not null,
        "event_type" varchar(64) not null,
        "payload_json" jsonb not null,
        "event_version" int not null,
        "created_at" timestamptz not null,
        "published_at" timestamptz null,
        "retry_count" int not null default 0,
        constraint catalog_outbox_retry_count_chk check (retry_count >= 0)
      );
    `);
    this.addSql(`
      create index if not exists "catalog_outbox_unpublished_idx"
        on "catalog_outbox" ("created_at")
        where "published_at" is null;
    `);
    this.addSql(`alter table "catalog_outbox" enable row level security;`);
    this.addSql(`alter table "catalog_outbox" force row level security;`);
    this.addSql(`
      create policy catalog_outbox_platform on "catalog_outbox"
        for all
        using (app.is_platform_scope() or true)
        with check (app.is_platform_scope() or true);
    `);

    this.addSql(`
      create table if not exists "inventory_outbox" (
        "id" uuid primary key,
        "aggregate_id" uuid not null,
        "event_type" varchar(64) not null,
        "payload_json" jsonb not null,
        "event_version" int not null,
        "created_at" timestamptz not null,
        "published_at" timestamptz null,
        "retry_count" int not null default 0,
        constraint inventory_outbox_retry_count_chk check (retry_count >= 0)
      );
    `);
    this.addSql(`
      create index if not exists "inventory_outbox_unpublished_idx"
        on "inventory_outbox" ("created_at")
        where "published_at" is null;
    `);
    this.addSql(`alter table "inventory_outbox" enable row level security;`);
    this.addSql(`alter table "inventory_outbox" force row level security;`);
    this.addSql(`
      create policy inventory_outbox_platform on "inventory_outbox"
        for all
        using (app.is_platform_scope() or true)
        with check (app.is_platform_scope() or true);
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "inventory_outbox";`);
    this.addSql(`drop table if exists "catalog_outbox";`);
  }
}
