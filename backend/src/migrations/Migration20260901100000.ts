import { Migration } from '@mikro-orm/migrations';

/** SEO discovery — redirect rules for technical SEO (301/302/410). */
export class Migration20260901100000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "seo_redirects" (
        "id" uuid not null,
        "source_path" varchar(2048) not null,
        "target_path" varchar(2048) null,
        "status_code" smallint not null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint "seo_redirects_pkey" primary key ("id"),
        constraint "seo_redirects_status_code_chk"
          check ("status_code" in (301, 302, 410)),
        constraint "seo_redirects_410_target_chk"
          check (
            ("status_code" = 410 and "target_path" is null)
            or ("status_code" in (301, 302) and "target_path" is not null)
          )
      );
    `);
    this.addSql(`
      create unique index if not exists "seo_redirects_source_path_uidx"
        on "seo_redirects" ("source_path");
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "seo_redirects";`);
  }
}
