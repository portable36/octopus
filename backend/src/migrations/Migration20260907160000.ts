import { Migration } from '@mikro-orm/migrations';

export class Migration20260907160000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "pos_shifts" (
        "id" uuid primary key,
        "store_id" uuid not null references "stores" ("id") on delete cascade,
        "vendor_id" uuid not null references "vendors" ("id") on delete cascade,
        "register_id" uuid not null references "pos_registers" ("id") on delete cascade,
        "cashier_id" uuid not null references "users" ("id") on delete cascade,
        "currency" varchar(3) not null,
        "opening_cash_minor" bigint not null,
        "opening_cash_before_adj_minor" bigint not null,
        "adj_amount_minor" bigint not null default 0,
        "adj_reason" text null,
        "adj_actor_id" uuid null,
        "cash_sales_minor" bigint not null default 0,
        "total_sales_minor" bigint not null default 0,
        "non_cash_sales_minor" bigint not null default 0,
        "cash_in_minor" bigint not null default 0,
        "cash_refunds_minor" bigint not null default 0,
        "cash_out_minor" bigint not null default 0,
        "actual_cash_minor" bigint null,
        "status" varchar(16) not null default 'OPEN',
        "opened_at" timestamptz not null,
        "closed_at" timestamptz null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint pos_shifts_status_chk check (status in ('OPEN', 'CLOSED'))
      );
    `);

    this.addSql(
      `create index if not exists "pos_shifts_store_id_idx" on "pos_shifts" ("store_id");`,
    );
    this.addSql(
      `create index if not exists "pos_shifts_vendor_id_idx" on "pos_shifts" ("vendor_id");`,
    );
    this.addSql(
      `create index if not exists "pos_shifts_register_id_status_idx" on "pos_shifts" ("register_id", "status");`,
    );

    this.addVendorStorePolicies('pos_shifts');
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "pos_shifts";`);
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
