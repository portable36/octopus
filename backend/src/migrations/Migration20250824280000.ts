import { Migration } from '@mikro-orm/migrations';

export class Migration20250824280000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "shipments" (
        "id" uuid primary key,
        "order_id" uuid not null references "orders" ("id") on delete restrict,
        "order_number" varchar(40) not null,
        "vendor_id" uuid not null references "vendors" ("id") on delete restrict,
        "store_id" uuid not null references "stores" ("id") on delete restrict,
        "provider" varchar(32) not null,
        "status" varchar(32) not null,
        "amount_to_collect_minor" int not null,
        "currency_code" varchar(3) not null,
        "merchant_order_ref" varchar(120) not null,
        "provider_consignment_id" varchar(120) null,
        "tracking_code" varchar(120) null,
        "provider_status" varchar(64) null,
        "recipient_json" jsonb not null,
        "item_summary" text not null,
        "weight_kg" real not null,
        "note" text null,
        "idempotency_key" varchar(180) not null,
        "version" int not null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint shipments_amount_chk check (amount_to_collect_minor >= 0),
        constraint shipments_provider_chk check (provider in ('STEADFAST','PATHAO','MANUAL')),
        constraint shipments_status_chk check (status in (
          'PENDING','PROCESSING','SHIPPED','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','FAILED','RETURNED'
        )),
        constraint shipments_version_chk check (version >= 1)
      );
    `);
    this.addSql(`
      create unique index if not exists "shipments_idempotency_unique"
        on "shipments" ("idempotency_key");
    `);
    this.addSql(`create index if not exists "shipments_order_id_idx" on "shipments" ("order_id");`);
    this.addSql(`create index if not exists "shipments_store_id_idx" on "shipments" ("store_id");`);

    this.addSql(`
      create table if not exists "shipment_lines" (
        "id" uuid primary key,
        "shipment_id" uuid not null references "shipments" ("id") on delete cascade,
        "order_line_id" varchar(64) not null,
        "quantity" int not null,
        constraint shipment_lines_qty_chk check (quantity > 0)
      );
    `);
    this.addSql(`
      create unique index if not exists "shipment_lines_shipment_line_unique"
        on "shipment_lines" ("shipment_id", "order_line_id");
    `);

    this.addSql(`
      create table if not exists "courier_accounts" (
        "id" uuid primary key,
        "vendor_id" uuid not null references "vendors" ("id") on delete cascade,
        "provider" varchar(32) not null,
        "credentials_cipher" text not null,
        "pathao_store_id" int null,
        "is_active" boolean not null default true,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint courier_accounts_provider_chk check (provider in ('STEADFAST','PATHAO','MANUAL'))
      );
    `);
    this.addSql(`
      create unique index if not exists "courier_accounts_vendor_provider_unique"
        on "courier_accounts" ("vendor_id", "provider");
    `);

    this.addSql(`
      create table if not exists "courier_oauth_tokens" (
        "id" uuid primary key,
        "vendor_id" uuid not null references "vendors" ("id") on delete cascade,
        "provider" varchar(32) not null,
        "access_token_cipher" text not null,
        "refresh_token_cipher" text not null,
        "expires_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint courier_oauth_provider_chk check (provider in ('PATHAO'))
      );
    `);
    this.addSql(`
      create unique index if not exists "courier_oauth_vendor_provider_unique"
        on "courier_oauth_tokens" ("vendor_id", "provider");
    `);

    this.addSql(`
      create table if not exists "fulfillment_operations" (
        "id" uuid primary key,
        "idempotency_key" varchar(180) not null,
        "operation_type" varchar(64) not null,
        "request_hash" varchar(64) not null,
        "response_json" jsonb not null,
        "created_at" timestamptz not null
      );
    `);
    this.addSql(`
      create unique index if not exists "fulfillment_operations_idempotency_unique"
        on "fulfillment_operations" ("idempotency_key");
    `);

    this.addSql(`
      create table if not exists "fulfillment_outbox" (
        "id" uuid primary key,
        "aggregate_id" uuid not null,
        "event_type" varchar(64) not null,
        "payload_json" jsonb not null,
        "event_version" int not null,
        "created_at" timestamptz not null,
        "published_at" timestamptz null
      );
    `);

    this.addVendorStorePolicies('shipments');
    this.addSql(`alter table "shipment_lines" enable row level security;`);
    this.addSql(`alter table "shipment_lines" force row level security;`);
    this.addSql(`
      create policy shipment_lines_all on "shipment_lines"
        for all
        using (
          app.is_platform_scope()
          or exists (
            select 1 from shipments s
            where s.id = shipment_lines.shipment_id
              and (
                (
                  app.current_vendor_id() is not null
                  and s.vendor_id::text = app.current_vendor_id()
                )
                or (
                  app.current_store_id() is not null
                  and s.store_id::text = app.current_store_id()
                )
                or exists (
                  select 1 from store_staff ss
                  where ss.store_id = s.store_id
                    and ss.user_id::text = app.current_user_id()
                )
                or exists (
                  select 1 from vendors v
                  where v.id = s.vendor_id
                    and v.owner_user_id::text = app.current_user_id()
                )
              )
          )
        )
        with check (app.is_platform_scope() or true);
    `);

    this.addSql(`alter table "courier_accounts" enable row level security;`);
    this.addSql(`alter table "courier_accounts" force row level security;`);
    this.addSql(`
      create policy courier_accounts_all on "courier_accounts"
        for all
        using (
          app.is_platform_scope()
          or (
            app.current_vendor_id() is not null
            and vendor_id::text = app.current_vendor_id()
          )
          or exists (
            select 1 from vendors v
            where v.id = courier_accounts.vendor_id
              and v.owner_user_id::text = app.current_user_id()
          )
        )
        with check (
          app.is_platform_scope()
          or (
            app.current_vendor_id() is not null
            and vendor_id::text = app.current_vendor_id()
          )
        );
    `);

    this.addSql(`alter table "courier_oauth_tokens" enable row level security;`);
    this.addSql(`alter table "courier_oauth_tokens" force row level security;`);
    this.addSql(`
      create policy courier_oauth_all on "courier_oauth_tokens"
        for all
        using (app.is_platform_scope() or vendor_id::text = app.current_vendor_id())
        with check (app.is_platform_scope() or vendor_id::text = app.current_vendor_id());
    `);

    this.addSql(`alter table "fulfillment_operations" enable row level security;`);
    this.addSql(`alter table "fulfillment_operations" force row level security;`);
    this.addSql(`
      create policy fulfillment_operations_all on "fulfillment_operations"
        for all using (app.is_platform_scope() or app.current_user_id() is not null)
        with check (app.is_platform_scope() or app.current_user_id() is not null);
    `);

    this.addSql(`alter table "fulfillment_outbox" enable row level security;`);
    this.addSql(`alter table "fulfillment_outbox" force row level security;`);
    this.addSql(`
      create policy fulfillment_outbox_all on "fulfillment_outbox"
        for all using (true) with check (true);
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
    this.addSql(`drop table if exists "fulfillment_outbox";`);
    this.addSql(`drop table if exists "fulfillment_operations";`);
    this.addSql(`drop table if exists "courier_oauth_tokens";`);
    this.addSql(`drop table if exists "courier_accounts";`);
    this.addSql(`drop table if exists "shipment_lines";`);
    this.addSql(`drop table if exists "shipments";`);
  }
}
