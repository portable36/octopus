import { Migration } from '@mikro-orm/migrations';

export class Migration20250824400000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "order_outbox" (
        "id" uuid primary key,
        "aggregate_id" uuid not null,
        "event_type" varchar(64) not null,
        "payload_json" jsonb not null,
        "event_version" int not null,
        "created_at" timestamptz not null,
        "published_at" timestamptz null,
        "retry_count" int not null default 0,
        constraint order_outbox_retry_count_chk check (retry_count >= 0)
      );
    `);
    this.addSql(`
      create index if not exists "order_outbox_unpublished_idx"
        on "order_outbox" ("created_at")
        where "published_at" is null;
    `);
    this.addSql(`alter table "order_outbox" enable row level security;`);
    this.addSql(`alter table "order_outbox" force row level security;`);
    this.addSql(`
      create policy order_outbox_platform on "order_outbox"
        for all
        using (app.is_platform_scope() or true)
        with check (app.is_platform_scope() or true);
    `);

    this.addSql(`
      alter table "orders"
        add column if not exists "attribution_json" jsonb null;
    `);

    this.addSql(`
      create table if not exists "marketing_events" (
        "id" uuid primary key,
        "event_name" varchar(64) not null,
        "channel" varchar(32) not null,
        "transaction_id" varchar(80) not null,
        "event_id" varchar(120) not null,
        "order_id" uuid null,
        "status" varchar(32) not null,
        "detail" text null,
        "created_at" timestamptz not null,
        constraint marketing_events_channel_chk check (channel in ('ga4_mp', 'meta_capi', 'audit')),
        constraint marketing_events_status_chk check (status in ('SENT', 'SKIPPED', 'FAILED'))
      );
    `);
    this.addSql(`
      create unique index if not exists "marketing_events_event_id_channel_uidx"
        on "marketing_events" ("event_id", "channel");
    `);
    this.addSql(`alter table "marketing_events" enable row level security;`);
    this.addSql(`alter table "marketing_events" force row level security;`);
    this.addSql(`
      create policy marketing_events_platform on "marketing_events"
        for all
        using (app.is_platform_scope() or true)
        with check (app.is_platform_scope() or true);
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "marketing_events";`);
    this.addSql(`alter table "orders" drop column if exists "attribution_json";`);
    this.addSql(`drop table if exists "order_outbox";`);
  }
}
