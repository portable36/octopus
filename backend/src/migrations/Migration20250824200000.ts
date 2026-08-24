import { Migration } from '@mikro-orm/migrations';

export class Migration20250824200000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "pricing_promotions" (
        "id" uuid primary key,
        "vendor_id" uuid not null references "vendors" ("id") on delete cascade,
        "store_id" uuid not null references "stores" ("id") on delete cascade,
        "name" varchar(160) not null,
        "coupon_code" varchar(64) null,
        "discount_type" varchar(32) not null,
        "discount_value" int not null,
        "currency_code" varchar(3) not null,
        "min_order_amount_minor" int not null,
        "scope" varchar(32) not null,
        "scope_ids" jsonb not null default '[]'::jsonb,
        "usage_limit" int null,
        "usage_count" int not null,
        "per_customer_limit" int null,
        "starts_at" timestamptz not null,
        "ends_at" timestamptz null,
        "status" varchar(32) not null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint pricing_promotions_discount_type_chk check (discount_type in ('PERCENTAGE', 'FIXED')),
        constraint pricing_promotions_discount_value_chk check (discount_value > 0),
        constraint pricing_promotions_min_order_chk check (min_order_amount_minor >= 0),
        constraint pricing_promotions_usage_count_chk check (usage_count >= 0),
        constraint pricing_promotions_scope_chk check (
          scope in ('ALL', 'PRODUCT', 'CATEGORY', 'VENDOR', 'STORE')
        ),
        constraint pricing_promotions_status_chk check (status in ('DRAFT', 'ACTIVE', 'DISABLED'))
      );
    `);
    this.addSql(`
      create unique index if not exists "pricing_promotions_vendor_coupon_unique"
        on "pricing_promotions" ("vendor_id", "coupon_code")
        where "coupon_code" is not null;
    `);
    this.addSql(
      `create index if not exists "pricing_promotions_store_id_idx" on "pricing_promotions" ("store_id");`,
    );
    this.addSql(
      `create index if not exists "pricing_promotions_status_idx" on "pricing_promotions" ("status");`,
    );

    this.addSql(`
      create table if not exists "pricing_promotion_usages" (
        "id" uuid primary key,
        "promotion_id" uuid not null references "pricing_promotions" ("id") on delete cascade,
        "vendor_id" uuid not null references "vendors" ("id") on delete cascade,
        "store_id" uuid not null references "stores" ("id") on delete cascade,
        "customer_id" uuid null,
        "order_id" varchar(120) not null,
        "idempotency_key" varchar(180) not null,
        "created_at" timestamptz not null
      );
    `);
    this.addSql(`
      create unique index if not exists "pricing_promotion_usages_idempotency_unique"
        on "pricing_promotion_usages" ("idempotency_key");
    `);
    this.addSql(`
      create index if not exists "pricing_promotion_usages_promo_customer_idx"
        on "pricing_promotion_usages" ("promotion_id", "customer_id");
    `);

    this.addVendorStorePolicies('pricing_promotions');
    this.addVendorStorePolicies('pricing_promotion_usages');
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

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "pricing_promotion_usages";`);
    this.addSql(`drop table if exists "pricing_promotions";`);
  }
}
