import { Migration } from '@mikro-orm/migrations';

/** Atomic checkout idempotency claims before side effects. */
export class Migration20250827440000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      alter table "checkout_submissions"
        drop constraint if exists "checkout_submissions_status_chk",
        alter column "outcome_json" drop not null,
        add column if not exists "processing_token" varchar(64) null,
        add column if not exists "updated_at" timestamptz;
    `);
    this.addSql(`
      update "checkout_submissions"
      set "updated_at" = "created_at"
      where "updated_at" is null;
    `);
    this.addSql(`
      alter table "checkout_submissions"
        alter column "updated_at" set not null,
        add constraint "checkout_submissions_status_chk"
          check ("status" in ('IN_PROGRESS', 'COMPLETED'));
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      delete from "checkout_submissions"
      where "status" = 'IN_PROGRESS';
    `);
    this.addSql(`
      alter table "checkout_submissions"
        drop constraint if exists "checkout_submissions_status_chk",
        drop column if exists "processing_token",
        drop column if exists "updated_at",
        alter column "outcome_json" set not null,
        add constraint "checkout_submissions_status_chk"
          check ("status" in ('COMPLETED'));
    `);
  }
}
