import { Migration } from '@mikro-orm/migrations';

/** Admin-managed platform system settings (key-value JSONB). */
export class Migration20260902130000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "system_settings" (
        "key" varchar(128) not null,
        "value" jsonb not null,
        "updated_at" timestamptz not null,
        constraint "system_settings_pkey" primary key ("key")
      );
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "system_settings";`);
  }
}
