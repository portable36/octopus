import { Migration } from '@mikro-orm/migrations';

export class Migration20250822210000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create schema if not exists app;`);

    this.addSql(`
      create table if not exists "user_memberships" (
        "id" uuid primary key,
        "user_id" uuid not null,
        "vendor_id" uuid not null,
        "store_ids" jsonb not null default '[]'::jsonb,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null
      );
    `);
    this.addSql(`
      create unique index if not exists "user_memberships_user_id_unique"
        on "user_memberships" ("user_id");
    `);
    this.addSql(`
      create index if not exists "user_memberships_vendor_id_idx"
        on "user_memberships" ("vendor_id");
    `);

    this.addSql(`alter table "user_memberships" enable row level security;`);
    this.addSql(`alter table "user_memberships" force row level security;`);
    this.addSql(`
      create policy user_memberships_select on "user_memberships"
        for select
        using (
          app.is_platform_scope()
          or user_id::text = app.current_user_id()
        );
    `);

    this.addSql(`
      create table if not exists "tenant_isolation_samples" (
        "id" uuid primary key,
        "vendor_id" uuid not null,
        "store_id" uuid null,
        "label" varchar(200) not null,
        "created_at" timestamptz not null
      );
    `);
    this.addSql(`
      create index if not exists "tenant_isolation_samples_vendor_id_idx"
        on "tenant_isolation_samples" ("vendor_id");
    `);
    this.addSql(`
      create index if not exists "tenant_isolation_samples_store_id_idx"
        on "tenant_isolation_samples" ("store_id");
    `);

    this.addSql(`
      create or replace function app.current_vendor_id() returns text
      language sql
      stable
      as $$
        select nullif(current_setting('app.vendor_id', true), '')
      $$;
    `);

    this.addSql(`
      create or replace function app.current_store_id() returns text
      language sql
      stable
      as $$
        select nullif(current_setting('app.store_id', true), '')
      $$;
    `);

    this.addSql(`
      create or replace function app.is_platform_scope() returns boolean
      language sql
      stable
      as $$
        select coalesce(current_setting('app.platform_scope', true), 'false') = 'true'
      $$;
    `);

    this.addSql(`
      create or replace function app.current_user_id() returns text
      language sql
      stable
      as $$
        select nullif(current_setting('app.user_id', true), '')
      $$;
    `);

    this.addSql(`alter table "tenant_isolation_samples" enable row level security;`);
    this.addSql(`alter table "tenant_isolation_samples" force row level security;`);

    this.addSql(`
      create policy tenant_isolation_samples_select on "tenant_isolation_samples"
        for select
        using (
          app.is_platform_scope()
          or (
            app.current_vendor_id() is not null
            and vendor_id::text = app.current_vendor_id()
            and (
              app.current_store_id() is null
              or store_id is null
              or store_id::text = app.current_store_id()
            )
          )
        );
    `);

    this.addSql(`
      create policy tenant_isolation_samples_insert on "tenant_isolation_samples"
        for insert
        with check (
          app.is_platform_scope()
          or (
            app.current_vendor_id() is not null
            and vendor_id::text = app.current_vendor_id()
            and (
              app.current_store_id() is null
              or store_id is null
              or store_id::text = app.current_store_id()
            )
          )
        );
    `);

    this.addSql(`
      create policy tenant_isolation_samples_update on "tenant_isolation_samples"
        for update
        using (
          app.is_platform_scope()
          or (
            app.current_vendor_id() is not null
            and vendor_id::text = app.current_vendor_id()
            and (
              app.current_store_id() is null
              or store_id is null
              or store_id::text = app.current_store_id()
            )
          )
        )
        with check (
          app.is_platform_scope()
          or (
            app.current_vendor_id() is not null
            and vendor_id::text = app.current_vendor_id()
            and (
              app.current_store_id() is null
              or store_id is null
              or store_id::text = app.current_store_id()
            )
          )
        );
    `);

    this.addSql(`
      create policy tenant_isolation_samples_delete on "tenant_isolation_samples"
        for delete
        using (
          app.is_platform_scope()
          or (
            app.current_vendor_id() is not null
            and vendor_id::text = app.current_vendor_id()
            and (
              app.current_store_id() is null
              or store_id is null
              or store_id::text = app.current_store_id()
            )
          )
        );
    `);
  }

  override async down(): Promise<void> {
    this.addSql(
      `drop policy if exists tenant_isolation_samples_delete on "tenant_isolation_samples";`,
    );
    this.addSql(
      `drop policy if exists tenant_isolation_samples_update on "tenant_isolation_samples";`,
    );
    this.addSql(
      `drop policy if exists tenant_isolation_samples_insert on "tenant_isolation_samples";`,
    );
    this.addSql(
      `drop policy if exists tenant_isolation_samples_select on "tenant_isolation_samples";`,
    );
    this.addSql(`drop table if exists "tenant_isolation_samples";`);
    this.addSql(`drop policy if exists user_memberships_select on "user_memberships";`);
    this.addSql(`drop table if exists "user_memberships";`);
    this.addSql(`drop function if exists app.current_user_id();`);
    this.addSql(`drop function if exists app.is_platform_scope();`);
    this.addSql(`drop function if exists app.current_store_id();`);
    this.addSql(`drop function if exists app.current_vendor_id();`);
    this.addSql(`drop schema if exists app;`);
  }
}
