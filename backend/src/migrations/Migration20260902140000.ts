import { Migration } from '@mikro-orm/migrations';

/** Platform-wide global settings (group + key composite PK, JSONB value). */
export class Migration20260902140000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "global_settings" (
        "group" varchar(64) not null,
        "key" varchar(128) not null,
        "value" jsonb not null,
        "updated_at" timestamptz not null,
        constraint "global_settings_pkey" primary key ("group", "key")
      );
    `);
    this.addSql(`
      create unique index if not exists "global_settings_group_key_unique"
        on "global_settings" ("group", "key");
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "global_settings";`);
  }
}
