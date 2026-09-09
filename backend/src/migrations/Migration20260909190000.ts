import { Migration } from '@mikro-orm/migrations';

export class Migration20260909190000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      alter table "users"
        add column if not exists "email_verified_at" timestamptz null;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      alter table "users"
        drop column if exists "email_verified_at";
    `);
  }
}
