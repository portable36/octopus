import { Migration } from '@mikro-orm/migrations';

/** Store identity extension, outbox, onboarding drafts, provisioning, domains. */
export class Migration20260902150000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      alter table "stores"
        add column if not exists "store_code" varchar(32),
        add column if not exists "store_type" varchar(32) not null default 'online',
        add column if not exists "ownership_kind" varchar(32) not null default 'vendor_owned',
        add column if not exists "phone" varchar(32),
        add column if not exists "email" varchar(255),
        add column if not exists "support_email" varchar(255),
        add column if not exists "latitude" double precision,
        add column if not exists "longitude" double precision,
        add column if not exists "opening_hours" jsonb;
    `);

    this.addSql(`
      update "stores"
      set "store_code" = upper(replace("slug", '-', ''))
      where "store_code" is null;
    `);

    this.addSql(`
      alter table "stores"
        alter column "store_code" set not null;
    `);

    this.addSql(`
      create unique index if not exists "stores_vendor_id_store_code_unique"
        on "stores" ("vendor_id", "store_code");
    `);

    this.addSql(`
      create table if not exists "store_outbox" (
        "id" uuid not null,
        "aggregate_id" uuid not null,
        "event_type" varchar(64) not null,
        "payload_json" jsonb not null,
        "event_version" int not null,
        "created_at" timestamptz not null,
        "published_at" timestamptz null,
        "retry_count" int not null default 0,
        constraint "store_outbox_pkey" primary key ("id")
      );
    `);

    this.addSql(`
      create index if not exists "store_outbox_unpublished_idx"
        on "store_outbox" ("published_at", "retry_count", "created_at")
        where "published_at" is null;
    `);

    this.addSql(`
      create table if not exists "store_onboarding_drafts" (
        "id" uuid not null,
        "vendor_id" uuid not null,
        "actor_user_id" uuid not null,
        "store_id" uuid null,
        "current_step" int not null default 1,
        "payload" jsonb not null default '{}',
        "status" varchar(32) not null default 'editing',
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint "store_onboarding_drafts_pkey" primary key ("id")
      );
    `);

    this.addSql(`
      create index if not exists "store_onboarding_drafts_vendor_idx"
        on "store_onboarding_drafts" ("vendor_id", "status");
    `);

    this.addSql(`
      create table if not exists "store_provisioning_runs" (
        "id" uuid not null,
        "store_id" uuid not null,
        "status" varchar(32) not null default 'running',
        "started_at" timestamptz not null,
        "completed_at" timestamptz null,
        "last_error" text null,
        constraint "store_provisioning_runs_pkey" primary key ("id")
      );
    `);

    this.addSql(`
      create index if not exists "store_provisioning_runs_store_idx"
        on "store_provisioning_runs" ("store_id", "started_at" desc);
    `);

    this.addSql(`
      create table if not exists "store_provisioning_steps" (
        "id" uuid not null,
        "run_id" uuid not null,
        "step_name" varchar(64) not null,
        "status" varchar(32) not null default 'pending',
        "started_at" timestamptz null,
        "completed_at" timestamptz null,
        "error" text null,
        "retry_count" int not null default 0,
        constraint "store_provisioning_steps_pkey" primary key ("id"),
        constraint "store_provisioning_steps_run_step_unique" unique ("run_id", "step_name")
      );
    `);

    this.addSql(`
      create table if not exists "store_domains" (
        "id" uuid not null,
        "store_id" uuid not null,
        "hostname" varchar(255) not null,
        "kind" varchar(32) not null default 'subdomain',
        "is_primary" boolean not null default false,
        "verification_status" varchar(32) not null default 'pending',
        "created_at" timestamptz not null,
        constraint "store_domains_pkey" primary key ("id"),
        constraint "store_domains_hostname_unique" unique ("hostname")
      );
    `);

    this.addSql(`
      create index if not exists "store_domains_store_idx"
        on "store_domains" ("store_id");
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "store_domains";`);
    this.addSql(`drop table if exists "store_provisioning_steps";`);
    this.addSql(`drop table if exists "store_provisioning_runs";`);
    this.addSql(`drop table if exists "store_onboarding_drafts";`);
    this.addSql(`drop table if exists "store_outbox";`);
    this.addSql(`drop index if exists "stores_vendor_id_store_code_unique";`);
    this.addSql(`
      alter table "stores"
        drop column if exists "store_code",
        drop column if exists "store_type",
        drop column if exists "ownership_kind",
        drop column if exists "phone",
        drop column if exists "email",
        drop column if exists "support_email",
        drop column if exists "latitude",
        drop column if exists "longitude",
        drop column if exists "opening_hours";
    `);
  }
}
