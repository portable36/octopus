import { Migration } from '@mikro-orm/migrations';

/** SEO discovery — per-entity metadata overrides (product, category, cms). */
export class Migration20260901110000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "seo_overrides" (
        "id" uuid not null,
        "entity_type" varchar(32) not null,
        "entity_id" uuid not null,
        "title" varchar(512) null,
        "description" text null,
        "noindex" boolean null,
        "canonical_url" varchar(2048) null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint "seo_overrides_pkey" primary key ("id"),
        constraint "seo_overrides_entity_type_chk"
          check ("entity_type" in ('product', 'category', 'cms'))
      );
    `);
    this.addSql(`
      create unique index if not exists "seo_overrides_entity_type_entity_id_uidx"
        on "seo_overrides" ("entity_type", "entity_id");
    `);
    this.addSql(`
      create index if not exists "seo_overrides_entity_type_entity_id_idx"
        on "seo_overrides" ("entity_type", "entity_id");
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "seo_overrides";`);
  }
}
