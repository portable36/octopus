import { Migration } from '@mikro-orm/migrations';

export class Migration20250824270000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      alter table "vendors"
        add column if not exists "cod_enabled" boolean not null default false,
        add column if not exists "cod_min_amount_minor" int not null default 0,
        add column if not exists "cod_max_amount_minor" int null,
        add column if not exists "cod_reservation_ttl_hours" int not null default 72;
    `);
    this.addSql(`
      alter table "vendors"
        add constraint vendors_cod_min_chk check (cod_min_amount_minor >= 0),
        add constraint vendors_cod_max_chk check (
          cod_max_amount_minor is null or cod_max_amount_minor >= cod_min_amount_minor
        ),
        add constraint vendors_cod_ttl_chk check (cod_reservation_ttl_hours > 0);
    `);

    this.addSql(`
      alter table "stores"
        add column if not exists "cod_enabled" boolean not null default false,
        add column if not exists "cod_min_amount_minor" int not null default 0,
        add column if not exists "cod_max_amount_minor" int null,
        add column if not exists "cod_reservation_ttl_hours" int not null default 72;
    `);
    this.addSql(`
      alter table "stores"
        add constraint stores_cod_min_chk check (cod_min_amount_minor >= 0),
        add constraint stores_cod_max_chk check (
          cod_max_amount_minor is null or cod_max_amount_minor >= cod_min_amount_minor
        ),
        add constraint stores_cod_ttl_chk check (cod_reservation_ttl_hours > 0);
    `);

    this.addSql(`
      alter table "orders"
        add column if not exists "payment_method" varchar(32) not null default 'SSLCOMMERZ';
    `);
    this.addSql(`
      alter table "orders"
        add constraint orders_payment_method_chk check (
          payment_method in ('COD','SSLCOMMERZ','BKASH','NAGAD')
        );
    `);

    this.addSql(`
      create table if not exists "payment_intents" (
        "id" uuid primary key,
        "checkout_id" uuid not null,
        "order_id" uuid not null references "orders" ("id") on delete restrict,
        "vendor_id" uuid not null references "vendors" ("id") on delete restrict,
        "store_id" uuid not null references "stores" ("id") on delete restrict,
        "customer_id" uuid null,
        "payment_method" varchar(32) not null,
        "provider" varchar(32) not null,
        "status" varchar(32) not null,
        "amount_minor" int not null,
        "currency_code" varchar(3) not null,
        "client_secret" varchar(120) null,
        "expires_at" timestamptz null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint payment_intents_amount_chk check (amount_minor >= 0),
        constraint payment_intents_method_chk check (
          payment_method in ('COD','SSLCOMMERZ','BKASH','NAGAD')
        ),
        constraint payment_intents_status_chk check (status in (
          'AWAITING_COLLECTION','COLLECTED','REQUIRES_PAYMENT','CANCELLED','FAILED','EXPIRED'
        )),
        constraint payment_intents_cod_secret_chk check (
          payment_method <> 'COD' or client_secret is null
        )
      );
    `);
    this.addSql(`
      create unique index if not exists "payment_intents_order_id_unique"
        on "payment_intents" ("order_id");
    `);
    this.addSql(`
      create index if not exists "payment_intents_checkout_id_idx"
        on "payment_intents" ("checkout_id");
    `);
    this.addSql(`
      create index if not exists "payment_intents_store_id_idx"
        on "payment_intents" ("store_id");
    `);

    this.addSql(`
      create table if not exists "payment_transactions" (
        "id" uuid primary key,
        "payment_intent_id" uuid not null references "payment_intents" ("id") on delete restrict,
        "order_id" uuid not null references "orders" ("id") on delete restrict,
        "collector_user_id" uuid not null,
        "amount_minor" int not null,
        "currency_code" varchar(3) not null,
        "note" text null,
        "idempotency_key" varchar(180) not null,
        "collected_at" timestamptz not null,
        "created_at" timestamptz not null,
        constraint payment_transactions_amount_chk check (amount_minor >= 0)
      );
    `);
    this.addSql(`
      create unique index if not exists "payment_transactions_idempotency_unique"
        on "payment_transactions" ("idempotency_key");
    `);

    this.addSql(`
      create table if not exists "payment_operations" (
        "id" uuid primary key,
        "idempotency_key" varchar(180) not null,
        "operation_type" varchar(64) not null,
        "request_hash" varchar(64) not null,
        "response_json" jsonb not null,
        "created_at" timestamptz not null
      );
    `);
    this.addSql(`
      create unique index if not exists "payment_operations_idempotency_unique"
        on "payment_operations" ("idempotency_key");
    `);

    this.addSql(`
      create table if not exists "payment_outbox" (
        "id" uuid primary key,
        "aggregate_id" uuid not null,
        "event_type" varchar(64) not null,
        "payload_json" jsonb not null,
        "event_version" int not null,
        "created_at" timestamptz not null,
        "published_at" timestamptz null
      );
    `);
    this.addSql(`
      create index if not exists "payment_outbox_unpublished_idx"
        on "payment_outbox" ("created_at")
        where "published_at" is null;
    `);

    this.addVendorStorePolicies('payment_intents');
    this.addSql(`alter table "payment_transactions" enable row level security;`);
    this.addSql(`alter table "payment_transactions" force row level security;`);
    this.addSql(`
      create policy payment_transactions_all on "payment_transactions"
        for all
        using (
          app.is_platform_scope()
          or exists (
            select 1 from payment_intents pi
            where pi.id = payment_transactions.payment_intent_id
              and (
                (
                  app.current_vendor_id() is not null
                  and pi.vendor_id::text = app.current_vendor_id()
                )
                or (
                  app.current_store_id() is not null
                  and pi.store_id::text = app.current_store_id()
                )
                or exists (
                  select 1 from store_staff ss
                  where ss.store_id = pi.store_id
                    and ss.user_id::text = app.current_user_id()
                )
                or exists (
                  select 1 from vendors v
                  where v.id = pi.vendor_id
                    and v.owner_user_id::text = app.current_user_id()
                )
              )
          )
        )
        with check (
          app.is_platform_scope()
          or exists (
            select 1 from payment_intents pi
            where pi.id = payment_transactions.payment_intent_id
              and (
                (
                  app.current_vendor_id() is not null
                  and pi.vendor_id::text = app.current_vendor_id()
                )
                or exists (
                  select 1 from store_staff ss
                  where ss.store_id = pi.store_id
                    and ss.user_id::text = app.current_user_id()
                )
                or exists (
                  select 1 from vendors v
                  where v.id = pi.vendor_id
                    and v.owner_user_id::text = app.current_user_id()
                )
              )
          )
        );
    `);

    this.addSql(`alter table "payment_operations" enable row level security;`);
    this.addSql(`alter table "payment_operations" force row level security;`);
    this.addSql(`
      create policy payment_operations_platform on "payment_operations"
        for all
        using (app.is_platform_scope() or app.current_user_id() is not null)
        with check (app.is_platform_scope() or app.current_user_id() is not null);
    `);

    this.addSql(`alter table "payment_outbox" enable row level security;`);
    this.addSql(`alter table "payment_outbox" force row level security;`);
    this.addSql(`
      create policy payment_outbox_platform on "payment_outbox"
        for all
        using (app.is_platform_scope() or true)
        with check (app.is_platform_scope() or true);
    `);
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
            customer_id is not null
            and customer_id::text = app.current_user_id()
          )
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
            customer_id is not null
            and customer_id::text = app.current_user_id()
          )
          or customer_id is null
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
    this.addSql(`drop table if exists "payment_outbox";`);
    this.addSql(`drop table if exists "payment_operations";`);
    this.addSql(`drop table if exists "payment_transactions";`);
    this.addSql(`drop table if exists "payment_intents";`);
    this.addSql(`alter table "orders" drop constraint if exists orders_payment_method_chk;`);
    this.addSql(`alter table "orders" drop column if exists "payment_method";`);
    this.addSql(`alter table "stores" drop constraint if exists stores_cod_ttl_chk;`);
    this.addSql(`alter table "stores" drop constraint if exists stores_cod_max_chk;`);
    this.addSql(`alter table "stores" drop constraint if exists stores_cod_min_chk;`);
    this.addSql(`
      alter table "stores"
        drop column if exists "cod_enabled",
        drop column if exists "cod_min_amount_minor",
        drop column if exists "cod_max_amount_minor",
        drop column if exists "cod_reservation_ttl_hours";
    `);
    this.addSql(`alter table "vendors" drop constraint if exists vendors_cod_ttl_chk;`);
    this.addSql(`alter table "vendors" drop constraint if exists vendors_cod_max_chk;`);
    this.addSql(`alter table "vendors" drop constraint if exists vendors_cod_min_chk;`);
    this.addSql(`
      alter table "vendors"
        drop column if exists "cod_enabled",
        drop column if exists "cod_min_amount_minor",
        drop column if exists "cod_max_amount_minor",
        drop column if exists "cod_reservation_ttl_hours";
    `);
  }
}
