import { Migration } from '@mikro-orm/migrations';

/** Phase 25.4 — TOTP MFA columns on users. */
export class Migration20250827430000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      alter table "users"
        add column if not exists "mfa_enabled" boolean not null default false,
        add column if not exists "mfa_secret_cipher" text null;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      alter table "users"
        drop column if exists "mfa_secret_cipher",
        drop column if exists "mfa_enabled";
    `);
  }
}
