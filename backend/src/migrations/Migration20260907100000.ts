import { Migration } from '@mikro-orm/migrations';

/** Phase 21.3 — item facts & refund facts read models for product performance and refund analytics. */
export class Migration20260907100000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "reporting_order_item_facts" (
        "id" uuid primary key,
        "order_id" uuid not null,
        "line_id" varchar(128) not null,
        "vendor_id" uuid not null,
        "store_id" uuid not null,
        "product_id" varchar(128) not null,
        "variant_id" varchar(128) not null,
        "quantity" int not null,
        "unit_price_minor" int not null,
        "total_minor" int not null,
        "currency_code" varchar(3) not null,
        "payment_status" varchar(40) not null,
        "created_at" timestamptz not null,
        "paid_at" timestamptz null,
        constraint reporting_order_item_facts_qty_chk check (quantity >= 0),
        constraint reporting_order_item_facts_total_chk check (total_minor >= 0)
      );
    `);
    this.addSql(`
      create index if not exists "reporting_order_item_facts_order_idx"
        on "reporting_order_item_facts" ("order_id");
    `);
    this.addSql(`
      create index if not exists "reporting_order_item_facts_vendor_idx"
        on "reporting_order_item_facts" ("vendor_id", "created_at");
    `);
    this.addSql(`
      create index if not exists "reporting_order_item_facts_store_idx"
        on "reporting_order_item_facts" ("store_id", "created_at");
    `);
    this.addSql(`
      create index if not exists "reporting_order_item_facts_product_idx"
        on "reporting_order_item_facts" ("product_id");
    `);
    this.addSql(`
      create index if not exists "reporting_order_item_facts_variant_idx"
        on "reporting_order_item_facts" ("variant_id");
    `);
    this.addSql(`alter table "reporting_order_item_facts" enable row level security;`);
    this.addSql(`alter table "reporting_order_item_facts" force row level security;`);
    this.addSql(`
      create policy reporting_order_item_facts_platform on "reporting_order_item_facts"
        for all
        using (app.is_platform_scope() or true)
        with check (app.is_platform_scope() or true);
    `);

    this.addSql(`
      create table if not exists "reporting_refund_facts" (
        "refund_id" uuid primary key,
        "order_id" uuid not null,
        "vendor_id" uuid not null,
        "store_id" uuid not null,
        "return_id" uuid null,
        "amount_minor" int not null,
        "currency_code" varchar(3) not null,
        "payment_method" varchar(32) null,
        "created_at" timestamptz not null,
        constraint reporting_refund_facts_amount_chk check (amount_minor >= 0)
      );
    `);
    this.addSql(`
      create index if not exists "reporting_refund_facts_order_idx"
        on "reporting_refund_facts" ("order_id");
    `);
    this.addSql(`
      create index if not exists "reporting_refund_facts_vendor_idx"
        on "reporting_refund_facts" ("vendor_id", "created_at");
    `);
    this.addSql(`
      create index if not exists "reporting_refund_facts_store_idx"
        on "reporting_refund_facts" ("store_id", "created_at");
    `);
    this.addSql(`alter table "reporting_refund_facts" enable row level security;`);
    this.addSql(`alter table "reporting_refund_facts" force row level security;`);
    this.addSql(`
      create policy reporting_refund_facts_platform on "reporting_refund_facts"
        for all
        using (app.is_platform_scope() or true)
        with check (app.is_platform_scope() or true);
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "reporting_refund_facts";`);
    this.addSql(`drop table if exists "reporting_order_item_facts";`);
  }
}
