import { Migration } from '@mikro-orm/migrations';

export class Migration20250824260000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "orders" (
        "id" uuid primary key,
        "order_number" varchar(40) not null,
        "checkout_id" uuid not null,
        "idempotency_key" varchar(180) not null,
        "customer_id" uuid null,
        "vendor_id" uuid not null references "vendors" ("id") on delete restrict,
        "store_id" uuid not null references "stores" ("id") on delete restrict,
        "currency_code" varchar(3) not null,
        "subtotal_minor" int not null,
        "discount_minor" int not null,
        "shipping_minor" int not null,
        "tax_minor" int not null,
        "commission_minor" int not null,
        "total_minor" int not null,
        "shipping_method" varchar(64) not null,
        "shipping_address_json" jsonb not null,
        "applied_promotion_id" uuid null,
        "applied_coupon_code" varchar(64) null,
        "pricing_snapshot_json" jsonb not null,
        "status" varchar(32) not null,
        "payment_status" varchar(32) not null,
        "fulfillment_status" varchar(32) not null,
        "version" int not null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint orders_money_chk check (
          subtotal_minor >= 0 and discount_minor >= 0 and shipping_minor >= 0
          and tax_minor >= 0 and commission_minor >= 0 and total_minor >= 0
        ),
        constraint orders_version_chk check (version >= 1),
        constraint orders_status_chk check (status in (
          'PENDING_PAYMENT','PAYMENT_FAILED','PAID','PROCESSING','PARTIALLY_FULFILLED',
          'FULFILLED','COMPLETED','CANCELLED','REFUND_REQUESTED','RETURN_REQUESTED','RETURNED'
        )),
        constraint orders_payment_status_chk check (payment_status in (
          'PENDING','PAID','FAILED','REFUND_REQUESTED','REFUNDED'
        )),
        constraint orders_fulfillment_status_chk check (fulfillment_status in (
          'UNFULFILLED','PARTIALLY_FULFILLED','FULFILLED','NOT_APPLICABLE'
        ))
      );
    `);
    this.addSql(`
      create unique index if not exists "orders_idempotency_unique"
        on "orders" ("idempotency_key");
    `);
    this.addSql(`
      create unique index if not exists "orders_order_number_unique"
        on "orders" ("order_number");
    `);
    this.addSql(`create index if not exists "orders_customer_id_idx" on "orders" ("customer_id");`);
    this.addSql(`create index if not exists "orders_store_id_idx" on "orders" ("store_id");`);
    this.addSql(`create index if not exists "orders_vendor_id_idx" on "orders" ("vendor_id");`);

    this.addSql(`
      create table if not exists "order_lines" (
        "id" uuid primary key,
        "order_id" uuid not null references "orders" ("id") on delete cascade,
        "line_id" varchar(64) not null,
        "product_id" uuid not null,
        "variant_id" uuid not null,
        "offer_id" uuid not null,
        "quantity" int not null,
        "fulfilled_quantity" int not null,
        "unit_price_minor" int not null,
        "line_subtotal_minor" int not null,
        "line_discount_minor" int not null,
        "line_tax_minor" int not null,
        "line_total_minor" int not null,
        "currency_code" varchar(3) not null,
        "reservation_id" varchar(120) not null,
        "warehouse_id" uuid not null,
        constraint order_lines_qty_chk check (quantity > 0),
        constraint order_lines_fulfilled_chk check (
          fulfilled_quantity >= 0 and fulfilled_quantity <= quantity
        ),
        constraint order_lines_money_chk check (
          unit_price_minor >= 0 and line_subtotal_minor >= 0 and line_discount_minor >= 0
          and line_tax_minor >= 0 and line_total_minor >= 0
        )
      );
    `);
    this.addSql(`
      create unique index if not exists "order_lines_order_line_unique"
        on "order_lines" ("order_id", "line_id");
    `);

    this.addVendorStorePolicies('orders');
    this.addSql(`alter table "order_lines" enable row level security;`);
    this.addSql(`alter table "order_lines" force row level security;`);
    this.addSql(`
      create policy order_lines_all on "order_lines"
        for all
        using (
          app.is_platform_scope()
          or exists (
            select 1 from orders o
            where o.id = order_lines.order_id
              and (
                (
                  o.customer_id is not null
                  and o.customer_id::text = app.current_user_id()
                )
                or (
                  app.current_vendor_id() is not null
                  and o.vendor_id::text = app.current_vendor_id()
                )
                or (
                  app.current_store_id() is not null
                  and o.store_id::text = app.current_store_id()
                )
                or exists (
                  select 1 from store_staff ss
                  where ss.store_id = o.store_id
                    and ss.user_id::text = app.current_user_id()
                )
                or exists (
                  select 1 from vendors v
                  where v.id = o.vendor_id
                    and v.owner_user_id::text = app.current_user_id()
                )
              )
          )
        )
        with check (
          app.is_platform_scope()
          or exists (
            select 1 from orders o
            where o.id = order_lines.order_id
              and (
                (
                  o.customer_id is not null
                  and o.customer_id::text = app.current_user_id()
                )
                or (
                  app.current_vendor_id() is not null
                  and o.vendor_id::text = app.current_vendor_id()
                )
                or exists (
                  select 1 from store_staff ss
                  where ss.store_id = o.store_id
                    and ss.user_id::text = app.current_user_id()
                )
                or exists (
                  select 1 from vendors v
                  where v.id = o.vendor_id
                    and v.owner_user_id::text = app.current_user_id()
                )
              )
          )
        );
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
            customer_id is not null
            and customer_id::text = app.current_user_id()
          )
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
    this.addSql(`drop table if exists "order_lines";`);
    this.addSql(`drop table if exists "orders";`);
  }
}
