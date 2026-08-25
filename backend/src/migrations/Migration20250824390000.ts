import { Migration } from '@mikro-orm/migrations';

/**
 * Phase 18.1 — public storefront read policies + customer profile/address book.
 * SELECT policies are additive (OR'd with existing tenant policies).
 */
export class Migration20250824390000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create policy catalog_products_public_select on "catalog_products"
        for select
        using (status = 'published');
    `);
    this.addSql(`
      create policy catalog_variants_public_select on "catalog_variants"
        for select
        using (
          exists (
            select 1 from catalog_products p
            where p.id = catalog_variants.product_id
              and p.status = 'published'
          )
        );
    `);
    this.addSql(`
      create policy catalog_store_offers_public_select on "catalog_store_offers"
        for select
        using (status = 'active');
    `);
    this.addSql(`
      create policy stores_public_select on "stores"
        for select
        using (status = 'active');
    `);
    this.addSql(`
      create policy media_assets_public_select on "media_assets"
        for select
        using (content_type like 'image/%');
    `);

    this.addSql(`
      create table if not exists "customer_profiles" (
        "user_id" uuid primary key,
        "display_name" varchar(200) not null,
        "phone" varchar(40) null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null
      );
    `);
    this.addSql(`alter table "customer_profiles" enable row level security;`);
    this.addSql(`alter table "customer_profiles" force row level security;`);
    this.addSql(`
      create policy customer_profiles_owner on "customer_profiles"
        for all
        using (
          app.is_platform_scope()
          or user_id::text = app.current_user_id()
        )
        with check (
          app.is_platform_scope()
          or user_id::text = app.current_user_id()
        );
    `);

    this.addSql(`
      create table if not exists "customer_addresses" (
        "id" uuid primary key,
        "user_id" uuid not null,
        "label" varchar(80) not null,
        "recipient_name" varchar(200) not null,
        "phone" varchar(40) null,
        "line1" varchar(200) not null,
        "line2" varchar(200) null,
        "city" varchar(120) not null,
        "region" varchar(120) null,
        "postal_code" varchar(32) null,
        "country_code" varchar(2) not null,
        "is_default" boolean not null default false,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null
      );
    `);
    this.addSql(
      `create index if not exists "customer_addresses_user_id_idx" on "customer_addresses" ("user_id");`,
    );
    this.addSql(`alter table "customer_addresses" enable row level security;`);
    this.addSql(`alter table "customer_addresses" force row level security;`);
    this.addSql(`
      create policy customer_addresses_owner on "customer_addresses"
        for all
        using (
          app.is_platform_scope()
          or user_id::text = app.current_user_id()
        )
        with check (
          app.is_platform_scope()
          or user_id::text = app.current_user_id()
        );
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop policy if exists customer_addresses_owner on "customer_addresses";`);
    this.addSql(`drop table if exists "customer_addresses";`);
    this.addSql(`drop policy if exists customer_profiles_owner on "customer_profiles";`);
    this.addSql(`drop table if exists "customer_profiles";`);
    this.addSql(`drop policy if exists media_assets_public_select on "media_assets";`);
    this.addSql(`drop policy if exists stores_public_select on "stores";`);
    this.addSql(
      `drop policy if exists catalog_store_offers_public_select on "catalog_store_offers";`,
    );
    this.addSql(`drop policy if exists catalog_variants_public_select on "catalog_variants";`);
    this.addSql(`drop policy if exists catalog_products_public_select on "catalog_products";`);
  }
}
