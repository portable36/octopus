import { Migration } from '@mikro-orm/migrations';

export class Migration20250824310000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "return_requests" (
        "id" uuid primary key,
        "order_id" uuid not null references "orders" ("id") on delete restrict,
        "customer_id" uuid not null,
        "vendor_id" uuid not null references "vendors" ("id") on delete restrict,
        "store_id" uuid not null references "stores" ("id") on delete restrict,
        "status" varchar(32) not null,
        "customer_note" text null,
        "rejection_reason_code" varchar(64) null,
        "rejection_note" text null,
        "items_json" jsonb not null,
        "inspection_json" jsonb null,
        "requested_at" timestamptz not null,
        "reviewed_at" timestamptz null,
        "approved_at" timestamptz null,
        "received_at" timestamptz null,
        "inspected_at" timestamptz null,
        "completed_at" timestamptz null,
        "version" int not null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint return_requests_status_chk check (status in (
          'REQUESTED','UNDER_REVIEW','REJECTED','APPROVED','AWAITING_RETURN',
          'RECEIVED','INSPECTING','INSPECTION_REJECTED','INSPECTION_APPROVED','CANCELLED'
        )),
        constraint return_requests_version_chk check (version >= 1)
      );
    `);
    this.addSql(
      `create index if not exists "return_requests_order_id_idx" on "return_requests" ("order_id");`,
    );
    this.addSql(
      `create index if not exists "return_requests_store_id_idx" on "return_requests" ("store_id");`,
    );

    this.addSql(`
      create table if not exists "return_operations" (
        "id" uuid primary key,
        "idempotency_key" varchar(128) not null,
        "operation_type" varchar(64) not null,
        "request_hash" varchar(64) not null,
        "response_json" jsonb not null,
        "created_at" timestamptz not null
      );
    `);
    this.addSql(`
      create unique index if not exists "return_operations_idempotency_key_unique"
        on "return_operations" ("idempotency_key");
    `);

    this.addSql(`
      create table if not exists "returns_outbox" (
        "id" uuid primary key,
        "aggregate_id" uuid not null,
        "event_type" varchar(64) not null,
        "payload_json" jsonb not null,
        "event_version" int not null,
        "created_at" timestamptz not null,
        "published_at" timestamptz null,
        "retry_count" int not null default 0,
        constraint returns_outbox_retry_count_chk check (retry_count >= 0)
      );
    `);
    this.addSql(`
      create index if not exists "returns_outbox_unpublished_idx"
        on "returns_outbox" ("created_at")
        where "published_at" is null;
    `);

    this.addVendorStorePolicies('return_requests');
    this.addSql(`alter table "return_operations" enable row level security;`);
    this.addSql(`alter table "return_operations" force row level security;`);
    this.addSql(`
      create policy return_operations_platform on "return_operations"
        for all
        using (app.is_platform_scope() or true)
        with check (app.is_platform_scope() or true);
    `);
    this.addSql(`alter table "returns_outbox" enable row level security;`);
    this.addSql(`alter table "returns_outbox" force row level security;`);
    this.addSql(`
      create policy returns_outbox_platform on "returns_outbox"
        for all
        using (app.is_platform_scope() or true)
        with check (app.is_platform_scope() or true);
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "returns_outbox";`);
    this.addSql(`drop table if exists "return_operations";`);
    this.addSql(`drop table if exists "return_requests";`);
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
          or (
            app.current_vendor_id() is not null
            and vendor_id::text = app.current_vendor_id()
          )
          or (
            app.current_store_id() is not null
            and store_id::text = app.current_store_id()
          )
        );
    `);
    this.addSql(`
      create policy ${table}_update on "${table}"
        for update
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
  }
}
