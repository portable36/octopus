import { Migration } from '@mikro-orm/migrations';

export class Migration20260906100000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "pos_registers" (
        "id" uuid primary key,
        "store_id" uuid not null references "stores" ("id") on delete cascade,
        "vendor_id" uuid not null references "vendors" ("id") on delete cascade,
        "code" varchar(32) not null,
        "name" varchar(120) not null,
        "status" varchar(32) not null default 'ACTIVE',
        "notes" text null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint pos_registers_status_chk check (status in ('ACTIVE', 'INACTIVE', 'DECOMMISSIONED'))
      );
    `);

    this.addSql(`
      create unique index if not exists "pos_registers_store_id_code_unique"
        on "pos_registers" ("store_id", "code");
    `);

    this.addSql(
      `create index if not exists "pos_registers_store_id_idx" on "pos_registers" ("store_id");`,
    );
    this.addSql(
      `create index if not exists "pos_registers_vendor_id_idx" on "pos_registers" ("vendor_id");`,
    );

    this.addVendorStorePolicies('pos_registers');
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "pos_registers";`);
  }

  private addVendorStorePolicies(table: string): void {
    this.addSql(`alter table "${table}" enable row level security;`);
    this.addSql(`alter table "${table}" force row level security;`);
    this.addSql(`
      create policy ${table}_select on "${table}"
        for select
        using (
          app.is_platform_scope()
          or (
            app.current_vendor_id() is not null
            and vendor_id::text = app.current_vendor_id()
          )
          or (
            app.current_store_id() is not null
            and store_id::text = app.current_store_id()
          )
          or exists (
            select 1 from store_staff ss
            where ss.store_id = ${table}.store_id
              and ss.user_id::text = app.current_user_id()
          )
          or exists (
            select 1 from vendors v
            where v.id = ${table}.vendor_id
              and v.owner_user_id::text = app.current_user_id()
          )
        );
    `);
    this.addSql(`
      create policy ${table}_insert on "${table}"
        for insert
        with check (
          app.is_platform_scope()
          or (
            app.current_vendor_id() is not null
            and vendor_id::text = app.current_vendor_id()
          )
          or exists (
            select 1 from store_staff ss
            where ss.store_id = ${table}.store_id
              and ss.user_id::text = app.current_user_id()
          )
          or exists (
            select 1 from vendors v
            where v.id = ${table}.vendor_id
              and v.owner_user_id::text = app.current_user_id()
          )
        );
    `);
    this.addSql(`
      create policy ${table}_update on "${table}"
        for update
        using (
          app.is_platform_scope()
          or (
            app.current_vendor_id() is not null
            and vendor_id::text = app.current_vendor_id()
          )
          or exists (
            select 1 from store_staff ss
            where ss.store_id = ${table}.store_id
              and ss.user_id::text = app.current_user_id()
          )
          or exists (
            select 1 from vendors v
            where v.id = ${table}.vendor_id
              and v.owner_user_id::text = app.current_user_id()
          )
        );
    `);
  }
}
