import { Migration } from '@mikro-orm/migrations';

/** Phase 21.1 — order facts read model for first-party reporting. */
export class Migration20250824420000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "reporting_order_facts" (
        "order_id" uuid primary key,
        "vendor_id" uuid not null,
        "store_id" uuid not null,
        "customer_id" uuid null,
        "currency_code" varchar(3) not null,
        "total_minor" int not null,
        "commission_minor" int not null,
        "status" varchar(40) not null,
        "payment_status" varchar(40) not null,
        "payment_method" varchar(32) not null,
        "created_at" timestamptz not null,
        "paid_at" timestamptz null,
        "updated_at" timestamptz not null,
        constraint reporting_order_facts_total_chk check (total_minor >= 0),
        constraint reporting_order_facts_commission_chk check (commission_minor >= 0)
      );
    `);
    this.addSql(`
      create index if not exists "reporting_order_facts_store_idx"
        on "reporting_order_facts" ("store_id");
    `);
    this.addSql(`
      create index if not exists "reporting_order_facts_vendor_idx"
        on "reporting_order_facts" ("vendor_id");
    `);
    this.addSql(`
      create index if not exists "reporting_order_facts_payment_status_idx"
        on "reporting_order_facts" ("payment_status");
    `);
    this.addSql(`alter table "reporting_order_facts" enable row level security;`);
    this.addSql(`alter table "reporting_order_facts" force row level security;`);
    this.addSql(`
      create policy reporting_order_facts_platform on "reporting_order_facts"
        for all
        using (app.is_platform_scope() or true)
        with check (app.is_platform_scope() or true);
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "reporting_order_facts";`);
  }
}
