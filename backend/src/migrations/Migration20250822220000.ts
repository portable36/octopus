import { Migration } from '@mikro-orm/migrations';

export class Migration20250822220000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "vendors" (
        "id" uuid primary key,
        "slug" varchar(80) not null,
        "display_name" varchar(160) not null,
        "description" text null,
        "legal_name" varchar(200) not null,
        "registration_number" varchar(120) null,
        "tax_id" varchar(120) null,
        "contact_email" varchar(320) not null,
        "contact_phone" varchar(40) null,
        "address_line" varchar(240) null,
        "city" varchar(120) null,
        "country_code" varchar(2) not null,
        "currency_code" varchar(3) not null,
        "timezone" varchar(64) not null,
        "accepts_online_orders" boolean not null default false,
        "status" varchar(32) not null,
        "owner_user_id" uuid not null,
        "rejection_reason" text null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null
      );
    `);
    this.addSql(`create unique index if not exists "vendors_slug_unique" on "vendors" ("slug");`);
    this.addSql(
      `create index if not exists "vendors_owner_user_id_idx" on "vendors" ("owner_user_id");`,
    );
    this.addSql(`create index if not exists "vendors_status_idx" on "vendors" ("status");`);

    this.addSql(`
      create table if not exists "vendor_staff" (
        "id" uuid primary key,
        "vendor_id" uuid not null references "vendors" ("id") on delete cascade,
        "user_id" uuid not null,
        "role" varchar(32) not null,
        "added_at" timestamptz not null
      );
    `);
    this.addSql(`
      create unique index if not exists "vendor_staff_vendor_user_unique"
        on "vendor_staff" ("vendor_id", "user_id");
    `);
    this.addSql(
      `create index if not exists "vendor_staff_user_id_idx" on "vendor_staff" ("user_id");`,
    );

    this.addSql(`
      create policy user_memberships_insert on "user_memberships"
        for insert
        with check (
          app.is_platform_scope()
          or user_id::text = app.current_user_id()
        );
    `);
    this.addSql(`
      create policy user_memberships_update on "user_memberships"
        for update
        using (
          app.is_platform_scope()
          or user_id::text = app.current_user_id()
        )
        with check (
          app.is_platform_scope()
          or user_id::text = app.current_user_id()
        );
    `);
    this.addSql(`
      create policy user_memberships_delete on "user_memberships"
        for delete
        using (
          app.is_platform_scope()
          or user_id::text = app.current_user_id()
        );
    `);

    this.addSql(`alter table "vendors" enable row level security;`);
    this.addSql(`alter table "vendors" force row level security;`);
    this.addSql(`
      create policy vendors_select on "vendors"
        for select
        using (
          app.is_platform_scope()
          or owner_user_id::text = app.current_user_id()
          or (
            app.current_vendor_id() is not null
            and id::text = app.current_vendor_id()
          )
          or exists (
            select 1 from vendor_staff vs
            where vs.vendor_id = vendors.id
              and vs.user_id::text = app.current_user_id()
          )
        );
    `);
    this.addSql(`
      create policy vendors_insert on "vendors"
        for insert
        with check (
          app.is_platform_scope()
          or owner_user_id::text = app.current_user_id()
        );
    `);
    this.addSql(`
      create policy vendors_update on "vendors"
        for update
        using (
          app.is_platform_scope()
          or owner_user_id::text = app.current_user_id()
          or (
            app.current_vendor_id() is not null
            and id::text = app.current_vendor_id()
          )
        )
        with check (
          app.is_platform_scope()
          or owner_user_id::text = app.current_user_id()
          or (
            app.current_vendor_id() is not null
            and id::text = app.current_vendor_id()
          )
        );
    `);
    this.addSql(`
      create policy vendors_delete on "vendors"
        for delete
        using (app.is_platform_scope());
    `);

    this.addSql(`alter table "vendor_staff" enable row level security;`);
    this.addSql(`alter table "vendor_staff" force row level security;`);
    this.addSql(`
      create policy vendor_staff_select on "vendor_staff"
        for select
        using (
          app.is_platform_scope()
          or user_id::text = app.current_user_id()
          or (
            app.current_vendor_id() is not null
            and vendor_id::text = app.current_vendor_id()
          )
          or exists (
            select 1 from vendors v
            where v.id = vendor_staff.vendor_id
              and v.owner_user_id::text = app.current_user_id()
          )
        );
    `);
    this.addSql(`
      create policy vendor_staff_insert on "vendor_staff"
        for insert
        with check (
          app.is_platform_scope()
          or user_id::text = app.current_user_id()
          or (
            app.current_vendor_id() is not null
            and vendor_id::text = app.current_vendor_id()
          )
          or exists (
            select 1 from vendors v
            where v.id = vendor_staff.vendor_id
              and v.owner_user_id::text = app.current_user_id()
          )
        );
    `);
    this.addSql(`
      create policy vendor_staff_update on "vendor_staff"
        for update
        using (
          app.is_platform_scope()
          or (
            app.current_vendor_id() is not null
            and vendor_id::text = app.current_vendor_id()
          )
          or exists (
            select 1 from vendors v
            where v.id = vendor_staff.vendor_id
              and v.owner_user_id::text = app.current_user_id()
          )
        )
        with check (
          app.is_platform_scope()
          or (
            app.current_vendor_id() is not null
            and vendor_id::text = app.current_vendor_id()
          )
          or exists (
            select 1 from vendors v
            where v.id = vendor_staff.vendor_id
              and v.owner_user_id::text = app.current_user_id()
          )
        );
    `);
    this.addSql(`
      create policy vendor_staff_delete on "vendor_staff"
        for delete
        using (
          app.is_platform_scope()
          or (
            app.current_vendor_id() is not null
            and vendor_id::text = app.current_vendor_id()
          )
          or exists (
            select 1 from vendors v
            where v.id = vendor_staff.vendor_id
              and v.owner_user_id::text = app.current_user_id()
          )
        );
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop policy if exists vendor_staff_delete on "vendor_staff";`);
    this.addSql(`drop policy if exists vendor_staff_update on "vendor_staff";`);
    this.addSql(`drop policy if exists vendor_staff_insert on "vendor_staff";`);
    this.addSql(`drop policy if exists vendor_staff_select on "vendor_staff";`);
    this.addSql(`drop table if exists "vendor_staff";`);
    this.addSql(`drop policy if exists vendors_delete on "vendors";`);
    this.addSql(`drop policy if exists vendors_update on "vendors";`);
    this.addSql(`drop policy if exists vendors_insert on "vendors";`);
    this.addSql(`drop policy if exists vendors_select on "vendors";`);
    this.addSql(`drop table if exists "vendors";`);
    this.addSql(`drop policy if exists user_memberships_delete on "user_memberships";`);
    this.addSql(`drop policy if exists user_memberships_update on "user_memberships";`);
    this.addSql(`drop policy if exists user_memberships_insert on "user_memberships";`);
  }
}
