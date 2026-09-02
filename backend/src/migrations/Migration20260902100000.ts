import { Migration } from '@mikro-orm/migrations';

/** AI personalization — pre-computed product co-purchase association matrix. */
export class Migration20260902100000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "product_associations" (
        "id" uuid not null,
        "product_id" uuid not null,
        "associated_product_id" uuid not null,
        "co_purchase_score" double precision not null,
        "updated_at" timestamptz not null,
        constraint "product_associations_pkey" primary key ("id"),
        constraint "product_associations_product_associated_uidx"
          unique ("product_id", "associated_product_id"),
        constraint "product_associations_no_self_chk"
          check ("product_id" <> "associated_product_id")
      );
    `);
    this.addSql(`
      create index if not exists "product_associations_product_id_idx"
        on "product_associations" ("product_id");
    `);
    this.addSql(`
      create index if not exists "product_associations_product_score_idx"
        on "product_associations" ("product_id", "co_purchase_score" desc);
    `);
    this.addSql(`
      create index if not exists "product_associations_associated_product_id_idx"
        on "product_associations" ("associated_product_id");
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_associations";`);
  }
}
