import { Migration } from '@mikro-orm/migrations';

export class Migration20250824180000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "inventory_warehouses" (
        "id" uuid primary key,
        "vendor_id" uuid not null references "vendors" ("id") on delete cascade,
        "store_id" uuid not null references "stores" ("id") on delete cascade,
        "code" varchar(40) not null,
        "name" varchar(160) not null,
        "status" varchar(32) not null,
        "address_line" varchar(240) null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint inventory_warehouses_status_chk check (status in ('ACTIVE', 'DISABLED'))
      );
    `);
    this.addSql(`
      create unique index if not exists "inventory_warehouses_store_code_unique"
        on "inventory_warehouses" ("store_id", "code");
    `);
    this.addSql(
      `create index if not exists "inventory_warehouses_vendor_id_idx" on "inventory_warehouses" ("vendor_id");`,
    );

    this.addSql(`
      create table if not exists "inventory_items" (
        "id" uuid primary key,
        "vendor_id" uuid not null references "vendors" ("id") on delete cascade,
        "store_id" uuid not null references "stores" ("id") on delete cascade,
        "warehouse_id" uuid not null references "inventory_warehouses" ("id") on delete cascade,
        "variant_id" uuid not null references "catalog_variants" ("id") on delete restrict,
        "on_hand" int not null,
        "reserved" int not null,
        "low_stock_threshold" int not null,
        "status" varchar(32) not null,
        "version" int not null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint inventory_items_on_hand_chk check (on_hand >= 0),
        constraint inventory_items_reserved_chk check (reserved >= 0),
        constraint inventory_items_reserved_le_on_hand_chk check (reserved <= on_hand),
        constraint inventory_items_threshold_chk check (low_stock_threshold >= 0),
        constraint inventory_items_status_chk check (status in ('ACTIVE', 'DISABLED')),
        constraint inventory_items_version_chk check (version >= 1)
      );
    `);
    this.addSql(`
      create unique index if not exists "inventory_items_warehouse_variant_unique"
        on "inventory_items" ("warehouse_id", "variant_id");
    `);
    this.addSql(
      `create index if not exists "inventory_items_variant_id_idx" on "inventory_items" ("variant_id");`,
    );
    this.addSql(
      `create index if not exists "inventory_items_store_id_idx" on "inventory_items" ("store_id");`,
    );

    this.addSql(`
      create table if not exists "inventory_reservations" (
        "id" uuid primary key,
        "vendor_id" uuid not null references "vendors" ("id") on delete cascade,
        "store_id" uuid not null references "stores" ("id") on delete cascade,
        "warehouse_id" uuid not null references "inventory_warehouses" ("id") on delete cascade,
        "variant_id" uuid not null references "catalog_variants" ("id") on delete restrict,
        "inventory_item_id" uuid not null references "inventory_items" ("id") on delete cascade,
        "order_id" varchar(120) not null,
        "quantity" int not null,
        "status" varchar(32) not null,
        "expires_at" timestamptz not null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint inventory_reservations_qty_chk check (quantity > 0),
        constraint inventory_reservations_status_chk check (
          status in ('PENDING', 'ACTIVE', 'RELEASED', 'EXPIRED', 'CONSUMED', 'CANCELLED')
        )
      );
    `);
    this.addSql(
      `create index if not exists "inventory_reservations_order_id_idx" on "inventory_reservations" ("order_id");`,
    );
    this.addSql(`
      create index if not exists "inventory_reservations_status_expires_idx"
        on "inventory_reservations" ("status", "expires_at");
    `);
    this.addSql(`
      create index if not exists "inventory_reservations_sku_warehouse_idx"
        on "inventory_reservations" ("variant_id", "warehouse_id");
    `);

    this.addSql(`
      create table if not exists "inventory_movements" (
        "id" uuid primary key,
        "vendor_id" uuid not null references "vendors" ("id") on delete cascade,
        "store_id" uuid not null references "stores" ("id") on delete cascade,
        "warehouse_id" uuid not null references "inventory_warehouses" ("id") on delete cascade,
        "variant_id" uuid not null,
        "inventory_item_id" uuid not null references "inventory_items" ("id") on delete cascade,
        "operation_type" varchar(32) not null,
        "quantity" int not null,
        "before_quantity" int not null,
        "after_quantity" int not null,
        "reference_type" varchar(32) not null,
        "reference_id" varchar(120) not null,
        "actor_user_id" uuid null,
        "reason" text null,
        "correlation_id" varchar(120) null,
        "created_at" timestamptz not null,
        constraint inventory_movements_qty_chk check (quantity > 0)
      );
    `);
    this.addSql(`
      create index if not exists "inventory_movements_sku_wh_created_idx"
        on "inventory_movements" ("variant_id", "warehouse_id", "created_at");
    `);
    this.addSql(`
      create index if not exists "inventory_movements_reference_idx"
        on "inventory_movements" ("reference_type", "reference_id");
    `);

    this.addSql(`
      create table if not exists "inventory_operations" (
        "id" uuid primary key,
        "idempotency_key" varchar(180) not null,
        "operation_type" varchar(64) not null,
        "reference_id" varchar(120) null,
        "result_json" jsonb null,
        "status" varchar(32) not null,
        "created_at" timestamptz not null,
        constraint inventory_operations_status_chk check (status in ('COMPLETED', 'FAILED'))
      );
    `);
    this.addSql(`
      create unique index if not exists "inventory_operations_idempotency_unique"
        on "inventory_operations" ("idempotency_key");
    `);

    this.addVendorStorePolicies('inventory_warehouses');
    this.addVendorStorePolicies('inventory_items');
    this.addVendorStorePolicies('inventory_reservations');
    this.addVendorStorePolicies('inventory_movements');
    // operations are global idempotency keys — platform + no tenant columns; use permissive insert via app role
    this.addSql(`alter table "inventory_operations" enable row level security;`);
    this.addSql(`alter table "inventory_operations" force row level security;`);
    this.addSql(`
      create policy inventory_operations_all on "inventory_operations"
        for all
        using (true)
        with check (true);
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
    this.addSql(`drop table if exists "inventory_operations";`);
    this.addSql(`drop table if exists "inventory_movements";`);
    this.addSql(`drop table if exists "inventory_reservations";`);
    this.addSql(`drop table if exists "inventory_items";`);
    this.addSql(`drop table if exists "inventory_warehouses";`);
  }
}
