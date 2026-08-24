import { Migration } from '@mikro-orm/migrations';

export class Migration20250824240000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "checkout_submissions" (
        "id" uuid primary key,
        "idempotency_key" varchar(180) not null,
        "request_hash" varchar(64) not null,
        "customer_id" uuid null,
        "guest_token" varchar(120) null,
        "cart_id" uuid not null,
        "outcome_json" jsonb not null,
        "status" varchar(32) not null,
        "created_at" timestamptz not null,
        constraint checkout_submissions_status_chk check (status in ('COMPLETED'))
      );
    `);
    this.addSql(`
      create unique index if not exists "checkout_submissions_idempotency_unique"
        on "checkout_submissions" ("idempotency_key");
    `);

    this.addSql(`
      create table if not exists "checkout_order_records" (
        "id" uuid primary key,
        "checkout_id" uuid not null,
        "idempotency_key" varchar(180) not null,
        "order_number" varchar(40) not null,
        "customer_id" uuid null,
        "vendor_id" uuid not null,
        "store_id" uuid not null,
        "currency_code" varchar(3) not null,
        "total_minor" int not null,
        "status" varchar(32) not null,
        "snapshot_json" jsonb not null,
        "created_at" timestamptz not null,
        constraint checkout_order_records_status_chk check (status in ('PENDING_PAYMENT')),
        constraint checkout_order_records_total_chk check (total_minor >= 0)
      );
    `);
    this.addSql(`
      create unique index if not exists "checkout_order_records_idempotency_unique"
        on "checkout_order_records" ("idempotency_key");
    `);
    this.addSql(
      `create index if not exists "checkout_order_records_checkout_id_idx" on "checkout_order_records" ("checkout_id");`,
    );

    this.addSql(`
      create table if not exists "checkout_payment_intents" (
        "id" uuid primary key,
        "checkout_id" uuid not null,
        "idempotency_key" varchar(180) not null,
        "customer_id" uuid null,
        "currency_code" varchar(3) not null,
        "amount_minor" int not null,
        "status" varchar(32) not null,
        "client_secret" varchar(120) not null,
        "order_ids_json" jsonb not null,
        "created_at" timestamptz not null,
        constraint checkout_payment_intents_status_chk check (status in ('REQUIRES_PAYMENT')),
        constraint checkout_payment_intents_amount_chk check (amount_minor >= 0)
      );
    `);
    this.addSql(`
      create unique index if not exists "checkout_payment_intents_idempotency_unique"
        on "checkout_payment_intents" ("idempotency_key");
    `);

    this.addSql(`alter table "checkout_submissions" enable row level security;`);
    this.addSql(`alter table "checkout_submissions" force row level security;`);
    this.addSql(`
      create policy checkout_submissions_all on "checkout_submissions"
        for all
        using (
          app.is_platform_scope()
          or (
            customer_id is not null
            and customer_id::text = app.current_user_id()
          )
          or (
            guest_token is not null
            and guest_token = nullif(current_setting('app.guest_token', true), '')
          )
        )
        with check (
          app.is_platform_scope()
          or (
            customer_id is not null
            and customer_id::text = app.current_user_id()
          )
          or (
            guest_token is not null
            and guest_token = nullif(current_setting('app.guest_token', true), '')
          )
        );
    `);

    // Temporary Phase 09 order/payment handoff tables: owner by customer_id, guests via null customer + authenticated request path.
    for (const table of ['checkout_order_records', 'checkout_payment_intents']) {
      this.addSql(`alter table "${table}" enable row level security;`);
      this.addSql(`alter table "${table}" force row level security;`);
      this.addSql(`
        create policy ${table}_all on "${table}"
          for all
          using (
            app.is_platform_scope()
            or customer_id is null
            or customer_id::text = app.current_user_id()
          )
          with check (
            app.is_platform_scope()
            or customer_id is null
            or customer_id::text = app.current_user_id()
          );
      `);
    }
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "checkout_payment_intents";`);
    this.addSql(`drop table if exists "checkout_order_records";`);
    this.addSql(`drop table if exists "checkout_submissions";`);
  }
}
