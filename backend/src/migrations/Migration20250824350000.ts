import { Migration } from '@mikro-orm/migrations';

export class Migration20250824350000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "vendor_payouts" (
        "id" uuid primary key,
        "vendor_id" uuid not null references "vendors" ("id") on delete restrict,
        "store_id" uuid not null references "stores" ("id") on delete restrict,
        "amount_minor" int not null,
        "currency_code" varchar(3) not null,
        "status" varchar(32) not null,
        "idempotency_key" varchar(180) not null,
        "requested_by_user_id" uuid not null,
        "rejection_reason" text null,
        "failure_reason" text null,
        "provider_ref" varchar(180) null,
        "ledger_entry_id" uuid null,
        "requested_at" timestamptz not null,
        "reviewed_at" timestamptz null,
        "approved_at" timestamptz null,
        "processing_at" timestamptz null,
        "completed_at" timestamptz null,
        "failed_at" timestamptz null,
        "version" int not null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint vendor_payouts_amount_chk check (amount_minor > 0),
        constraint vendor_payouts_version_chk check (version >= 1),
        constraint vendor_payouts_status_chk check (
          status in (
            'REQUESTED','UNDER_REVIEW','APPROVED','PROCESSING','COMPLETED','FAILED','REJECTED'
          )
        )
      );
    `);
    this.addSql(`
      create unique index if not exists "vendor_payouts_idempotency_unique"
        on "vendor_payouts" ("idempotency_key");
    `);
    this.addSql(
      `create index if not exists "vendor_payouts_vendor_status_idx" on "vendor_payouts" ("vendor_id", "status");`,
    );
    this.addSql(
      `create index if not exists "vendor_payouts_store_id_idx" on "vendor_payouts" ("store_id");`,
    );

    this.addSql(`alter table "vendor_payouts" enable row level security;`);
    this.addSql(`alter table "vendor_payouts" force row level security;`);
    this.addSql(`
      create policy vendor_payouts_select on "vendor_payouts"
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
            where ss.store_id = vendor_payouts.store_id
              and ss.user_id::text = app.current_user_id()
          )
          or exists (
            select 1 from vendors v
            where v.id = vendor_payouts.vendor_id
              and v.owner_user_id::text = app.current_user_id()
          )
        );
    `);
    this.addSql(`
      create policy vendor_payouts_write on "vendor_payouts"
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

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "vendor_payouts";`);
  }
}
