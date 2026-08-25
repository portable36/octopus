import { Migration } from '@mikro-orm/migrations';

export class Migration20250824320000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "payment_refunds" (
        "id" uuid primary key,
        "payment_intent_id" uuid not null references "payment_intents" ("id") on delete restrict,
        "order_id" uuid not null,
        "vendor_id" uuid not null references "vendors" ("id") on delete restrict,
        "store_id" uuid not null references "stores" ("id") on delete restrict,
        "return_id" uuid null,
        "amount_minor" int not null,
        "currency_code" varchar(3) not null,
        "method" varchar(32) not null,
        "status" varchar(32) not null,
        "reason" text null,
        "provider_refund_id" varchar(180) null,
        "provider_response_code" varchar(64) null,
        "provider_received_at" timestamptz null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        "completed_at" timestamptz null,
        constraint payment_refunds_amount_chk check (amount_minor > 0),
        constraint payment_refunds_method_chk check (method in ('MANUAL','ORIGINAL_PROVIDER')),
        constraint payment_refunds_status_chk check (status in ('PENDING','SUCCEEDED','FAILED'))
      );
    `);
    this.addSql(
      `create index if not exists "payment_refunds_payment_intent_id_idx" on "payment_refunds" ("payment_intent_id");`,
    );
    this.addSql(
      `create index if not exists "payment_refunds_order_id_idx" on "payment_refunds" ("order_id");`,
    );
    this.addSql(
      `create index if not exists "payment_refunds_store_id_idx" on "payment_refunds" ("store_id");`,
    );

    this.addSql(`alter table "payment_refunds" enable row level security;`);
    this.addSql(`alter table "payment_refunds" force row level security;`);
    this.addSql(`
      create policy payment_refunds_select on "payment_refunds"
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
            where ss.store_id = payment_refunds.store_id
              and ss.user_id::text = app.current_user_id()
          )
          or exists (
            select 1 from vendors v
            where v.id = payment_refunds.vendor_id
              and v.owner_user_id::text = app.current_user_id()
          )
        );
    `);
    this.addSql(`
      create policy payment_refunds_write on "payment_refunds"
        for all
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
            where ss.store_id = payment_refunds.store_id
              and ss.user_id::text = app.current_user_id()
          )
          or exists (
            select 1 from vendors v
            where v.id = payment_refunds.vendor_id
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
            and store_id::text = app.current_store_id()
          )
          or exists (
            select 1 from store_staff ss
            where ss.store_id = payment_refunds.store_id
              and ss.user_id::text = app.current_user_id()
          )
          or exists (
            select 1 from vendors v
            where v.id = payment_refunds.vendor_id
              and v.owner_user_id::text = app.current_user_id()
          )
        );
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "payment_refunds";`);
  }
}
