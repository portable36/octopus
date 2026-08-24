import { Migration } from '@mikro-orm/migrations';

export class Migration20250824120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "pos_receipt_templates" (
        "id" uuid primary key,
        "store_id" uuid not null references "stores" ("id") on delete cascade,
        "vendor_id" uuid not null references "vendors" ("id") on delete cascade,
        "display_name" varchar(160) not null,
        "address_lines" jsonb not null default '[]'::jsonb,
        "phone" varchar(40) null,
        "website" varchar(120) null,
        "header_lines" jsonb not null default '[]'::jsonb,
        "footer_lines" jsonb not null default '[]'::jsonb,
        "thank_you_text" text not null,
        "returns_policy_text" text not null,
        "show_sku" boolean not null default false,
        "show_tax" boolean not null default false,
        "paper_width" int not null,
        "locale" varchar(16) not null,
        "currency_code" varchar(3) not null,
        "logo_media_id" varchar(64) null,
        "version" int not null,
        "updated_at" timestamptz not null,
        "updated_by" uuid null,
        constraint pos_receipt_templates_paper_width_chk check (paper_width in (58, 80)),
        constraint pos_receipt_templates_version_chk check (version >= 1)
      );
    `);
    this.addSql(`
      create unique index if not exists "pos_receipt_templates_store_id_unique"
        on "pos_receipt_templates" ("store_id");
    `);
    this.addSql(
      `create index if not exists "pos_receipt_templates_vendor_id_idx" on "pos_receipt_templates" ("vendor_id");`,
    );

    this.addSql(`
      create table if not exists "pos_receipt_sequences" (
        "id" uuid primary key,
        "store_id" uuid not null references "stores" ("id") on delete cascade,
        "day_key" varchar(8) not null,
        "next_value" int not null,
        constraint pos_receipt_sequences_next_value_chk check (next_value >= 1)
      );
    `);
    this.addSql(`
      create unique index if not exists "pos_receipt_sequences_store_day_unique"
        on "pos_receipt_sequences" ("store_id", "day_key");
    `);

    this.addSql(`
      create table if not exists "pos_receipts" (
        "id" uuid primary key,
        "store_id" uuid not null references "stores" ("id") on delete cascade,
        "vendor_id" uuid not null references "vendors" ("id") on delete cascade,
        "sale_id" uuid not null,
        "receipt_number" varchar(40) not null,
        "template_id" uuid not null references "pos_receipt_templates" ("id"),
        "template_version_used" int not null,
        "snapshot" jsonb not null,
        "rendered_text" text not null,
        "status" varchar(32) not null,
        "created_at" timestamptz not null,
        "created_by" uuid not null,
        constraint pos_receipts_status_chk check (status in ('REQUESTED', 'PRINTED', 'FAILED'))
      );
    `);
    this.addSql(`
      create unique index if not exists "pos_receipts_store_receipt_number_unique"
        on "pos_receipts" ("store_id", "receipt_number");
    `);
    this.addSql(`
      create unique index if not exists "pos_receipts_store_sale_unique"
        on "pos_receipts" ("store_id", "sale_id");
    `);
    this.addSql(
      `create index if not exists "pos_receipts_vendor_id_idx" on "pos_receipts" ("vendor_id");`,
    );

    this.addVendorStorePolicies('pos_receipt_templates');
    this.addVendorStorePolicies('pos_receipts');
    this.addStoreOnlyPolicies('pos_receipt_sequences');
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

  private addStoreOnlyPolicies(table: string): void {
    this.addSql(`alter table "${table}" enable row level security;`);
    this.addSql(`alter table "${table}" force row level security;`);
    this.addSql(`
      create policy ${table}_select on "${table}"
        for select
        using (
          app.is_platform_scope()
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
            select 1 from stores s
            join vendors v on v.id = s.vendor_id
            where s.id = ${table}.store_id
              and (
                v.owner_user_id::text = app.current_user_id()
                or (
                  app.current_vendor_id() is not null
                  and s.vendor_id::text = app.current_vendor_id()
                )
              )
          )
        );
    `);
    this.addSql(`
      create policy ${table}_insert on "${table}"
        for insert
        with check (
          app.is_platform_scope()
          or exists (
            select 1 from store_staff ss
            where ss.store_id = ${table}.store_id
              and ss.user_id::text = app.current_user_id()
          )
          or exists (
            select 1 from stores s
            join vendors v on v.id = s.vendor_id
            where s.id = ${table}.store_id
              and (
                v.owner_user_id::text = app.current_user_id()
                or (
                  app.current_vendor_id() is not null
                  and s.vendor_id::text = app.current_vendor_id()
                )
              )
          )
        );
    `);
    this.addSql(`
      create policy ${table}_update on "${table}"
        for update
        using (
          app.is_platform_scope()
          or exists (
            select 1 from store_staff ss
            where ss.store_id = ${table}.store_id
              and ss.user_id::text = app.current_user_id()
          )
          or exists (
            select 1 from stores s
            join vendors v on v.id = s.vendor_id
            where s.id = ${table}.store_id
              and (
                v.owner_user_id::text = app.current_user_id()
                or (
                  app.current_vendor_id() is not null
                  and s.vendor_id::text = app.current_vendor_id()
                )
              )
          )
        );
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "pos_receipts";`);
    this.addSql(`drop table if exists "pos_receipt_sequences";`);
    this.addSql(`drop table if exists "pos_receipt_templates";`);
  }
}
