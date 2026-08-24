import { Migration } from '@mikro-orm/migrations';

export class Migration20250824220000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "carts" (
        "id" uuid primary key,
        "customer_id" uuid null,
        "guest_token" varchar(120) null,
        "currency_code" varchar(3) null,
        "status" varchar(32) not null,
        "version" int not null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint carts_status_chk check (status in ('ACTIVE', 'CHECKED_OUT', 'ABANDONED')),
        constraint carts_version_chk check (version >= 1),
        constraint carts_owner_chk check (customer_id is not null or guest_token is not null)
      );
    `);
    this.addSql(`
      create unique index if not exists "carts_active_customer_unique"
        on "carts" ("customer_id")
        where "status" = 'ACTIVE' and "customer_id" is not null;
    `);
    this.addSql(`
      create unique index if not exists "carts_active_guest_unique"
        on "carts" ("guest_token")
        where "status" = 'ACTIVE' and "guest_token" is not null;
    `);

    this.addSql(`
      create table if not exists "cart_lines" (
        "id" uuid primary key,
        "cart_id" uuid not null references "carts" ("id") on delete cascade,
        "vendor_id" uuid not null references "vendors" ("id") on delete restrict,
        "store_id" uuid not null references "stores" ("id") on delete restrict,
        "product_id" uuid not null references "catalog_products" ("id") on delete restrict,
        "variant_id" uuid not null references "catalog_variants" ("id") on delete restrict,
        "offer_id" uuid not null references "catalog_store_offers" ("id") on delete restrict,
        "quantity" int not null,
        "unit_price_snapshot_minor" int not null,
        "currency_code" varchar(3) not null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint cart_lines_qty_chk check (quantity > 0 and quantity <= 99),
        constraint cart_lines_price_chk check (unit_price_snapshot_minor >= 0)
      );
    `);
    this.addSql(`
      create unique index if not exists "cart_lines_cart_store_variant_unique"
        on "cart_lines" ("cart_id", "store_id", "variant_id");
    `);
    this.addSql(
      `create index if not exists "cart_lines_vendor_id_idx" on "cart_lines" ("vendor_id");`,
    );

    this.addSql(`alter table "carts" enable row level security;`);
    this.addSql(`alter table "carts" force row level security;`);
    this.addSql(`
      create policy carts_select on "carts"
        for select
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
        );
    `);
    this.addSql(`
      create policy carts_insert on "carts"
        for insert
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
    this.addSql(`
      create policy carts_update on "carts"
        for update
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
        );
    `);

    this.addSql(`alter table "cart_lines" enable row level security;`);
    this.addSql(`alter table "cart_lines" force row level security;`);
    this.addSql(`
      create policy cart_lines_all on "cart_lines"
        for all
        using (
          app.is_platform_scope()
          or exists (
            select 1 from carts c
            where c.id = cart_lines.cart_id
              and (
                (
                  c.customer_id is not null
                  and c.customer_id::text = app.current_user_id()
                )
                or (
                  c.guest_token is not null
                  and c.guest_token = nullif(current_setting('app.guest_token', true), '')
                )
              )
          )
        )
        with check (
          app.is_platform_scope()
          or exists (
            select 1 from carts c
            where c.id = cart_lines.cart_id
              and (
                (
                  c.customer_id is not null
                  and c.customer_id::text = app.current_user_id()
                )
                or (
                  c.guest_token is not null
                  and c.guest_token = nullif(current_setting('app.guest_token', true), '')
                )
              )
          )
        );
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "cart_lines";`);
    this.addSql(`drop table if exists "carts";`);
  }
}
