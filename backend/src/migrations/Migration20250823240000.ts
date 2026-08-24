import { Migration } from '@mikro-orm/migrations';

export class Migration20250823240000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "catalog_products" (
        "id" uuid primary key,
        "vendor_id" uuid not null,
        "sku" varchar(64) not null,
        "name" varchar(200) not null,
        "description" text null,
        "brand_id" uuid null,
        "category_ids" jsonb not null default '[]'::jsonb,
        "status" varchar(32) not null,
        "attributes" jsonb not null default '[]'::jsonb,
        "media" jsonb not null default '[]'::jsonb,
        "variant_ids" jsonb not null default '[]'::jsonb,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null
      );
    `);
    this.addSql(`
      create unique index if not exists "catalog_products_vendor_sku_unique"
        on "catalog_products" ("vendor_id", "sku");
    `);
    this.addSql(
      `create index if not exists "catalog_products_vendor_id_idx" on "catalog_products" ("vendor_id");`,
    );

    this.addSql(`
      create table if not exists "catalog_variants" (
        "id" uuid primary key,
        "vendor_id" uuid not null,
        "product_id" uuid not null references "catalog_products" ("id") on delete cascade,
        "sku" varchar(64) not null,
        "name" varchar(200) not null,
        "barcode" varchar(64) null,
        "gtin" varchar(32) null,
        "ean" varchar(32) null,
        "upc" varchar(32) null,
        "mpn" varchar(120) null,
        "manufacturer_reference" varchar(120) null,
        "cost_price_minor" integer null,
        "base_price_minor" integer null,
        "compare_at_price_minor" integer null,
        "currency_code" varchar(3) null,
        "status" varchar(32) not null,
        "attributes" jsonb not null default '[]'::jsonb,
        "media" jsonb not null default '[]'::jsonb,
        "external_references" jsonb not null default '[]'::jsonb,
        "tax_classification_reference" varchar(120) null,
        "shipping_classification_reference" varchar(120) null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null
      );
    `);
    this.addSql(`
      create unique index if not exists "catalog_variants_vendor_sku_unique"
        on "catalog_variants" ("vendor_id", "sku");
    `);
    this.addSql(
      `create index if not exists "catalog_variants_product_id_idx" on "catalog_variants" ("product_id");`,
    );

    this.addSql(`
      create table if not exists "catalog_categories" (
        "id" uuid primary key,
        "name" varchar(160) not null,
        "slug" varchar(80) not null,
        "parent_id" uuid null references "catalog_categories" ("id") on delete set null,
        "status" varchar(32) not null,
        "sort_order" integer not null default 0,
        "seo_title" varchar(200) null,
        "seo_description" text null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null
      );
    `);
    this.addSql(`
      create unique index if not exists "catalog_categories_parent_slug_unique"
        on "catalog_categories" ("parent_id", "slug");
    `);

    this.addSql(`
      create table if not exists "catalog_store_offers" (
        "id" uuid primary key,
        "vendor_id" uuid not null,
        "store_id" uuid not null,
        "product_id" uuid not null,
        "variant_id" uuid not null,
        "price_minor" integer not null,
        "currency_code" varchar(3) not null,
        "status" varchar(32) not null,
        "is_available" boolean not null default false,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null
      );
    `);
    this.addSql(`
      create unique index if not exists "catalog_store_offers_store_variant_unique"
        on "catalog_store_offers" ("store_id", "variant_id");
    `);

    for (const table of ['catalog_products', 'catalog_variants', 'catalog_store_offers'] as const) {
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
            or exists (
              select 1 from vendors v
              where v.id = ${table}.vendor_id
                and v.owner_user_id::text = app.current_user_id()
            )
          );
      `);
      this.addSql(`
        create policy ${table}_mutate on "${table}"
          for all
          using (
            app.is_platform_scope()
            or (
              app.current_vendor_id() is not null
              and vendor_id::text = app.current_vendor_id()
            )
            or exists (
              select 1 from vendors v
              where v.id = ${table}.vendor_id
                and v.owner_user_id::text = app.current_user_id()
            )
          )
          with check (
            app.is_platform_scope()
            or (
              app.current_vendor_id() is not null
              and vendor_id::text = app.current_vendor_id()
            )
            or exists (
              select 1 from vendors v
              where v.id = ${table}.vendor_id
                and v.owner_user_id::text = app.current_user_id()
            )
          );
      `);
    }

    this.addSql(`alter table "catalog_categories" enable row level security;`);
    this.addSql(`alter table "catalog_categories" force row level security;`);
    this.addSql(`
      create policy catalog_categories_select on "catalog_categories"
        for select using (true);
    `);
    this.addSql(`
      create policy catalog_categories_mutate on "catalog_categories"
        for all
        using (app.is_platform_scope())
        with check (app.is_platform_scope());
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "catalog_store_offers";`);
    this.addSql(`drop table if exists "catalog_variants";`);
    this.addSql(`drop table if exists "catalog_products";`);
    this.addSql(`drop table if exists "catalog_categories";`);
  }
}
