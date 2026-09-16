import { Migration } from '@mikro-orm/migrations';

export class Migration20260916100000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      alter table "media_assets"
        add column if not exists "status" varchar(32) not null default 'ready',
        add column if not exists "rejection_reason" text null,
        add column if not exists "processed_at" timestamptz null;
    `);
    this.addSql(`
      create index if not exists "media_assets_status_idx" on "media_assets" ("status");
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "media_assets_status_idx";`);
    this.addSql(`
      alter table "media_assets"
        drop column if exists "status",
        drop column if exists "rejection_reason",
        drop column if exists "processed_at";
    `);
  }
}
