import { Migration } from '@mikro-orm/migrations';

export class Migration20250822200000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "users" (
        "id" uuid primary key,
        "email" varchar(320) not null,
        "name" varchar(120) not null,
        "password_hash" varchar(255) not null,
        "status" varchar(32) not null,
        "roles" jsonb not null,
        "failed_login_attempts" int not null default 0,
        "locked_until" timestamptz null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null
      );
    `);
    this.addSql(`
      create unique index if not exists "users_email_unique" on "users" ("email");
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "users";`);
  }
}
