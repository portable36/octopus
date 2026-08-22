import { Migration } from '@mikro-orm/migrations';

export class Migration20250822150000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create extension if not exists "pgcrypto";`);
    this.addSql(`
      create table if not exists "platform_schema_lock" (
        "id" int primary key,
        "initialized_at" timestamptz not null
      );
    `);
    this.addSql(`
      insert into "platform_schema_lock" ("id", "initialized_at")
      values (1, now())
      on conflict ("id") do nothing;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "platform_schema_lock";`);
    this.addSql(`drop extension if exists "pgcrypto";`);
  }
}
