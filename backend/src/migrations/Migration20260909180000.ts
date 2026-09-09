import { Migration } from '@mikro-orm/migrations';

export class Migration20260909180000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "customer_wishlist_items" (
        "id" uuid primary key,
        "user_id" uuid not null references "users" ("id") on delete cascade,
        "product_id" uuid not null,
        "variant_id" uuid null,
        "store_id" uuid null,
        "created_at" timestamptz not null,
        constraint customer_wishlist_items_user_product_uq unique ("user_id", "product_id")
      );
    `);
    this.addSql(
      `create index if not exists "customer_wishlist_items_user_id_idx" on "customer_wishlist_items" ("user_id");`,
    );
    this.addOwnerPolicies('customer_wishlist_items');

    this.addSql(`
      create table if not exists "product_reviews" (
        "id" uuid primary key,
        "product_id" uuid not null,
        "user_id" uuid not null references "users" ("id") on delete cascade,
        "order_id" uuid null,
        "rating" smallint not null,
        "title" varchar(200) not null,
        "body" text not null,
        "status" varchar(16) not null default 'PUBLISHED',
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint product_reviews_rating_chk check (rating between 1 and 5),
        constraint product_reviews_status_chk check (status in ('PENDING', 'PUBLISHED', 'REJECTED')),
        constraint product_reviews_user_product_uq unique ("user_id", "product_id")
      );
    `);
    this.addSql(
      `create index if not exists "product_reviews_product_id_status_idx" on "product_reviews" ("product_id", "status");`,
    );
    this.addSql(
      `create index if not exists "product_reviews_user_id_idx" on "product_reviews" ("user_id");`,
    );

    this.addSql(`alter table "product_reviews" enable row level security;`);
    this.addSql(`alter table "product_reviews" force row level security;`);
    this.addSql(`
      create policy product_reviews_select on "product_reviews"
        for select
        using (
          app.is_platform_scope()
          or status = 'PUBLISHED'
          or user_id::text = app.current_user_id()
        );
    `);
    this.addSql(`
      create policy product_reviews_insert on "product_reviews"
        for insert
        with check (
          app.is_platform_scope()
          or user_id::text = app.current_user_id()
        );
    `);
    this.addSql(`
      create policy product_reviews_update on "product_reviews"
        for update
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
      create policy product_reviews_delete on "product_reviews"
        for delete
        using (
          app.is_platform_scope()
          or user_id::text = app.current_user_id()
        );
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop policy if exists product_reviews_delete on "product_reviews";`);
    this.addSql(`drop policy if exists product_reviews_update on "product_reviews";`);
    this.addSql(`drop policy if exists product_reviews_insert on "product_reviews";`);
    this.addSql(`drop policy if exists product_reviews_select on "product_reviews";`);
    this.addSql(`drop table if exists "product_reviews";`);
    this.addSql(
      `drop policy if exists customer_wishlist_items_owner on "customer_wishlist_items";`,
    );
    this.addSql(`drop table if exists "customer_wishlist_items";`);
  }

  private addOwnerPolicies(table: string): void {
    this.addSql(`alter table "${table}" enable row level security;`);
    this.addSql(`alter table "${table}" force row level security;`);
    this.addSql(`
      create policy ${table}_owner on "${table}"
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
}
