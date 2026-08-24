import { Migration } from '@mikro-orm/migrations';

export class Migration20250823230000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "stores" (
        "id" uuid primary key,
        "vendor_id" uuid not null references "vendors" ("id") on delete cascade,
        "slug" varchar(80) not null,
        "display_name" varchar(160) not null,
        "description" text null,
        "address_line1" varchar(240) null,
        "address_line2" varchar(240) null,
        "city" varchar(120) null,
        "region" varchar(120) null,
        "postal_code" varchar(32) null,
        "country_code" varchar(2) not null,
        "currency_code" varchar(3) not null,
        "timezone" varchar(64) not null,
        "locale" varchar(16) not null,
        "accepts_online_orders" boolean not null default false,
        "status" varchar(32) not null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null
      );
    `);
    this.addSql(`
      create unique index if not exists "stores_vendor_slug_unique"
        on "stores" ("vendor_id", "slug");
    `);
    this.addSql(`create index if not exists "stores_vendor_id_idx" on "stores" ("vendor_id");`);
    this.addSql(`create index if not exists "stores_status_idx" on "stores" ("status");`);

    this.addSql(`
      create table if not exists "store_staff" (
        "id" uuid primary key,
        "store_id" uuid not null references "stores" ("id") on delete cascade,
        "user_id" uuid not null,
        "role" varchar(32) not null,
        "added_at" timestamptz not null
      );
    `);
    this.addSql(`
      create unique index if not exists "store_staff_store_user_unique"
        on "store_staff" ("store_id", "user_id");
    `);
    this.addSql(
      `create index if not exists "store_staff_user_id_idx" on "store_staff" ("user_id");`,
    );

    this.addSql(`alter table "stores" enable row level security;`);
    this.addSql(`alter table "stores" force row level security;`);
    this.addSql(`
      create policy stores_select on "stores"
        for select
        using (
          app.is_platform_scope()
          or (
            app.current_vendor_id() is not null
            and vendor_id::text = app.current_vendor_id()
          )
          or (
            app.current_store_id() is not null
            and id::text = app.current_store_id()
          )
          or exists (
            select 1 from store_staff ss
            where ss.store_id = stores.id
              and ss.user_id::text = app.current_user_id()
          )
          or exists (
            select 1 from vendors v
            where v.id = stores.vendor_id
              and v.owner_user_id::text = app.current_user_id()
          )
        );
    `);
    this.addSql(`
      create policy stores_insert on "stores"
        for insert
        with check (
          app.is_platform_scope()
          or (
            app.current_vendor_id() is not null
            and vendor_id::text = app.current_vendor_id()
          )
          or exists (
            select 1 from vendors v
            where v.id = stores.vendor_id
              and v.owner_user_id::text = app.current_user_id()
          )
        );
    `);
    this.addSql(`
      create policy stores_update on "stores"
        for update
        using (
          app.is_platform_scope()
          or (
            app.current_vendor_id() is not null
            and vendor_id::text = app.current_vendor_id()
          )
          or (
            app.current_store_id() is not null
            and id::text = app.current_store_id()
          )
          or exists (
            select 1 from store_staff ss
            where ss.store_id = stores.id
              and ss.user_id::text = app.current_user_id()
              and ss.role = 'STORE_MANAGER'
          )
          or exists (
            select 1 from vendors v
            where v.id = stores.vendor_id
              and v.owner_user_id::text = app.current_user_id()
          )
        )
        with check (
          app.is_platform_scope()
          or (
            app.current_vendor_id() is not null
            and vendor_id::text = app.current_vendor_id()
          )
          or (
            app.current_store_id() is not null
            and id::text = app.current_store_id()
          )
          or exists (
            select 1 from store_staff ss
            where ss.store_id = stores.id
              and ss.user_id::text = app.current_user_id()
              and ss.role = 'STORE_MANAGER'
          )
          or exists (
            select 1 from vendors v
            where v.id = stores.vendor_id
              and v.owner_user_id::text = app.current_user_id()
          )
        );
    `);
    this.addSql(`
      create policy stores_delete on "stores"
        for delete
        using (app.is_platform_scope());
    `);

    this.addSql(`alter table "store_staff" enable row level security;`);
    this.addSql(`alter table "store_staff" force row level security;`);
    this.addSql(`
      create policy store_staff_select on "store_staff"
        for select
        using (
          app.is_platform_scope()
          or user_id::text = app.current_user_id()
          or (
            app.current_store_id() is not null
            and store_id::text = app.current_store_id()
          )
          or exists (
            select 1 from stores s
            where s.id = store_staff.store_id
              and (
                (
                  app.current_vendor_id() is not null
                  and s.vendor_id::text = app.current_vendor_id()
                )
                or exists (
                  select 1 from vendors v
                  where v.id = s.vendor_id
                    and v.owner_user_id::text = app.current_user_id()
                )
              )
          )
        );
    `);
    this.addSql(`
      create policy store_staff_insert on "store_staff"
        for insert
        with check (
          app.is_platform_scope()
          or (
            app.current_store_id() is not null
            and store_id::text = app.current_store_id()
          )
          or exists (
            select 1 from stores s
            where s.id = store_staff.store_id
              and (
                (
                  app.current_vendor_id() is not null
                  and s.vendor_id::text = app.current_vendor_id()
                )
                or exists (
                  select 1 from vendors v
                  where v.id = s.vendor_id
                    and v.owner_user_id::text = app.current_user_id()
                )
                or exists (
                  select 1 from store_staff mgr
                  where mgr.store_id = s.id
                    and mgr.user_id::text = app.current_user_id()
                    and mgr.role = 'STORE_MANAGER'
                )
              )
          )
        );
    `);
    this.addSql(`
      create policy store_staff_update on "store_staff"
        for update
        using (
          app.is_platform_scope()
          or (
            app.current_store_id() is not null
            and store_id::text = app.current_store_id()
          )
          or exists (
            select 1 from stores s
            where s.id = store_staff.store_id
              and exists (
                select 1 from vendors v
                where v.id = s.vendor_id
                  and v.owner_user_id::text = app.current_user_id()
              )
          )
        )
        with check (
          app.is_platform_scope()
          or (
            app.current_store_id() is not null
            and store_id::text = app.current_store_id()
          )
          or exists (
            select 1 from stores s
            where s.id = store_staff.store_id
              and exists (
                select 1 from vendors v
                where v.id = s.vendor_id
                  and v.owner_user_id::text = app.current_user_id()
              )
          )
        );
    `);
    this.addSql(`
      create policy store_staff_delete on "store_staff"
        for delete
        using (
          app.is_platform_scope()
          or (
            app.current_store_id() is not null
            and store_id::text = app.current_store_id()
          )
          or exists (
            select 1 from stores s
            where s.id = store_staff.store_id
              and exists (
                select 1 from vendors v
                where v.id = s.vendor_id
                  and v.owner_user_id::text = app.current_user_id()
              )
          )
        );
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop policy if exists store_staff_delete on "store_staff";`);
    this.addSql(`drop policy if exists store_staff_update on "store_staff";`);
    this.addSql(`drop policy if exists store_staff_insert on "store_staff";`);
    this.addSql(`drop policy if exists store_staff_select on "store_staff";`);
    this.addSql(`drop table if exists "store_staff";`);
    this.addSql(`drop policy if exists stores_delete on "stores";`);
    this.addSql(`drop policy if exists stores_update on "stores";`);
    this.addSql(`drop policy if exists stores_insert on "stores";`);
    this.addSql(`drop policy if exists stores_select on "stores";`);
    this.addSql(`drop table if exists "stores";`);
  }
}
