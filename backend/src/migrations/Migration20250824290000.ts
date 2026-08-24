import { Migration } from '@mikro-orm/migrations';

export class Migration20250824290000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "configuration_documents" (
        "id" uuid primary key,
        "key" varchar(64) not null,
        "scope_kind" varchar(16) not null,
        "vendor_id" uuid null,
        "store_id" uuid null,
        "schema_version" int not null,
        "payload" jsonb not null,
        "updated_at" timestamptz not null,
        "updated_by" uuid null,
        constraint configuration_documents_scope_kind_chk
          check (scope_kind in ('platform', 'vendor', 'store')),
        constraint configuration_documents_key_chk
          check (key in ('general', 'branding')),
        constraint configuration_documents_schema_version_chk
          check (schema_version >= 1),
        constraint configuration_documents_scope_consistency_chk check (
          (scope_kind = 'platform' and vendor_id is null and store_id is null)
          or (scope_kind = 'vendor' and vendor_id is not null and store_id is null)
          or (scope_kind = 'store' and vendor_id is not null and store_id is not null)
        )
      );
    `);
    this.addSql(`
      create unique index if not exists "configuration_documents_scope_key_unique"
        on "configuration_documents" (
          "key",
          "scope_kind",
          coalesce("vendor_id", '00000000-0000-0000-0000-000000000000'::uuid),
          coalesce("store_id", '00000000-0000-0000-0000-000000000000'::uuid)
        );
    `);
    this.addSql(`alter table "configuration_documents" enable row level security;`);
    this.addSql(`alter table "configuration_documents" force row level security;`);
    this.addSql(`
      create policy configuration_documents_all on "configuration_documents"
        for all
        using (
          app.is_platform_scope()
          or (
            vendor_id is not null
            and vendor_id::text = app.current_vendor_id()
          )
          or (
            store_id is not null
            and store_id::text = app.current_store_id()
          )
        )
        with check (
          app.is_platform_scope()
          or (
            vendor_id is not null
            and vendor_id::text = app.current_vendor_id()
          )
          or (
            store_id is not null
            and store_id::text = app.current_store_id()
          )
        );
    `);

    this.addSql(`
      create table if not exists "media_assets" (
        "id" uuid primary key,
        "original_filename" varchar(255) not null,
        "content_type" varchar(128) not null,
        "byte_size" int not null,
        "storage_key" varchar(512) not null,
        "uploaded_by" uuid not null,
        "vendor_id" uuid null,
        "store_id" uuid null,
        "created_at" timestamptz not null,
        constraint media_assets_byte_size_chk check (byte_size > 0)
      );
    `);
    this.addSql(
      `create index if not exists "media_assets_storage_key_idx" on "media_assets" ("storage_key");`,
    );
    this.addSql(`alter table "media_assets" enable row level security;`);
    this.addSql(`alter table "media_assets" force row level security;`);
    this.addSql(`
      create policy media_assets_all on "media_assets"
        for all
        using (
          app.is_platform_scope()
          or uploaded_by::text = app.current_user_id()
          or (
            vendor_id is not null
            and vendor_id::text = app.current_vendor_id()
          )
          or (
            store_id is not null
            and store_id::text = app.current_store_id()
          )
        )
        with check (
          app.is_platform_scope()
          or uploaded_by::text = app.current_user_id()
          or (
            vendor_id is not null
            and vendor_id::text = app.current_vendor_id()
          )
          or (
            store_id is not null
            and store_id::text = app.current_store_id()
          )
        );
    `);

    this.addSql(`
      create table if not exists "audit_events" (
        "id" uuid primary key,
        "actor_user_id" uuid null,
        "action" varchar(128) not null,
        "resource_type" varchar(64) not null,
        "resource_id" varchar(128) null,
        "vendor_id" uuid null,
        "store_id" uuid null,
        "request_id" varchar(64) null,
        "before" jsonb null,
        "after" jsonb null,
        "metadata" jsonb null,
        "created_at" timestamptz not null
      );
    `);
    this.addSql(
      `create index if not exists "audit_events_created_at_idx" on "audit_events" ("created_at" desc);`,
    );
    this.addSql(`alter table "audit_events" enable row level security;`);
    this.addSql(`alter table "audit_events" force row level security;`);
    this.addSql(`
      create policy audit_events_select on "audit_events"
        for select
        using (app.is_platform_scope());
    `);
    this.addSql(`
      create policy audit_events_insert on "audit_events"
        for insert
        with check (
          app.is_platform_scope()
          or app.current_user_id() is not null
        );
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop policy if exists audit_events_insert on "audit_events";`);
    this.addSql(`drop policy if exists audit_events_select on "audit_events";`);
    this.addSql(`drop table if exists "audit_events";`);

    this.addSql(`drop policy if exists media_assets_all on "media_assets";`);
    this.addSql(`drop table if exists "media_assets";`);

    this.addSql(`drop policy if exists configuration_documents_all on "configuration_documents";`);
    this.addSql(`drop table if exists "configuration_documents";`);
  }
}
