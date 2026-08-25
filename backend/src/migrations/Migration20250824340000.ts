import { Migration } from '@mikro-orm/migrations';

export class Migration20250824340000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "vendor_ledger_entries" (
        "id" uuid primary key,
        "vendor_id" uuid not null references "vendors" ("id") on delete restrict,
        "store_id" uuid not null references "stores" ("id") on delete restrict,
        "entry_type" varchar(32) not null,
        "direction" varchar(8) not null,
        "amount_minor" int not null,
        "currency_code" varchar(3) not null,
        "order_id" uuid null,
        "reference_type" varchar(32) not null,
        "reference_id" varchar(120) not null,
        "idempotency_key" varchar(180) not null,
        "available_at" timestamptz not null,
        "occurred_at" timestamptz not null,
        "created_at" timestamptz not null,
        "metadata_json" jsonb null,
        constraint vendor_ledger_entries_amount_chk check (amount_minor > 0),
        constraint vendor_ledger_entries_type_chk check (
          entry_type in ('SALE','COMMISSION','REFUND','ADJUSTMENT','PAYOUT')
        ),
        constraint vendor_ledger_entries_direction_chk check (direction in ('CREDIT','DEBIT'))
      );
    `);
    this.addSql(`
      create unique index if not exists "vendor_ledger_entries_idempotency_unique"
        on "vendor_ledger_entries" ("idempotency_key");
    `);
    this.addSql(`
      create unique index if not exists "vendor_ledger_entries_ref_unique"
        on "vendor_ledger_entries" ("entry_type", "reference_type", "reference_id");
    `);
    this.addSql(
      `create index if not exists "vendor_ledger_entries_vendor_id_idx" on "vendor_ledger_entries" ("vendor_id", "occurred_at");`,
    );
    this.addSql(
      `create index if not exists "vendor_ledger_entries_store_id_idx" on "vendor_ledger_entries" ("store_id");`,
    );
    this.addSql(
      `create index if not exists "vendor_ledger_entries_available_at_idx" on "vendor_ledger_entries" ("vendor_id", "available_at");`,
    );

    this.addSql(`
      create table if not exists "vendor_ledger_balances" (
        "vendor_id" uuid primary key references "vendors" ("id") on delete cascade,
        "currency_code" varchar(3) not null,
        "pending_minor" int not null,
        "available_minor" int not null,
        "rebuilt_at" timestamptz not null,
        constraint vendor_ledger_balances_pending_chk check (pending_minor >= 0),
        constraint vendor_ledger_balances_available_chk check (available_minor >= 0)
      );
    `);

    this.addSql(`
      create table if not exists "payout_outbox" (
        "id" uuid primary key,
        "aggregate_id" uuid not null,
        "event_type" varchar(64) not null,
        "payload_json" jsonb not null,
        "event_version" int not null,
        "created_at" timestamptz not null,
        "published_at" timestamptz null,
        "retry_count" int not null default 0,
        constraint payout_outbox_retry_count_chk check (retry_count >= 0)
      );
    `);
    this.addSql(`
      create index if not exists "payout_outbox_unpublished_idx"
        on "payout_outbox" ("created_at")
        where "published_at" is null;
    `);

    this.addVendorStorePolicies('vendor_ledger_entries');
    this.addSql(`alter table "vendor_ledger_balances" enable row level security;`);
    this.addSql(`alter table "vendor_ledger_balances" force row level security;`);
    this.addSql(`
      create policy vendor_ledger_balances_select on "vendor_ledger_balances"
        for select
        using (
          app.is_platform_scope()
          or (
            app.current_vendor_id() is not null
            and vendor_id::text = app.current_vendor_id()
          )
          or exists (
            select 1 from vendors v
            where v.id = vendor_ledger_balances.vendor_id
              and v.owner_user_id::text = app.current_user_id()
          )
        );
    `);
    this.addSql(`
      create policy vendor_ledger_balances_write on "vendor_ledger_balances"
        for all
        using (app.is_platform_scope())
        with check (app.is_platform_scope());
    `);
    this.addSql(`alter table "payout_outbox" enable row level security;`);
    this.addSql(`alter table "payout_outbox" force row level security;`);
    this.addSql(`
      create policy payout_outbox_platform on "payout_outbox"
        for all
        using (app.is_platform_scope() or true)
        with check (app.is_platform_scope() or true);
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "payout_outbox";`);
    this.addSql(`drop table if exists "vendor_ledger_balances";`);
    this.addSql(`drop table if exists "vendor_ledger_entries";`);
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
      create policy ${table}_write on "${table}"
        for all
        using (
          app.is_platform_scope()
          or (
            app.current_vendor_id() is not null
            and vendor_id::text = app.current_vendor_id()
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
  }
}
