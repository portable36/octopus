import { Migration } from '@mikro-orm/migrations';

export class Migration20250824300000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      alter table "payment_outbox"
        add column if not exists "retry_count" int not null default 0;
    `);
    this.addSql(`
      alter table "payment_outbox"
        add constraint payment_outbox_retry_count_chk check (retry_count >= 0);
    `);

    this.addSql(`
      alter table "fulfillment_outbox"
        add column if not exists "retry_count" int not null default 0;
    `);
    this.addSql(`
      alter table "fulfillment_outbox"
        add constraint fulfillment_outbox_retry_count_chk check (retry_count >= 0);
    `);
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "fulfillment_outbox" drop constraint if exists fulfillment_outbox_retry_count_chk;`,
    );
    this.addSql(`alter table "fulfillment_outbox" drop column if exists "retry_count";`);
    this.addSql(
      `alter table "payment_outbox" drop constraint if exists payment_outbox_retry_count_chk;`,
    );
    this.addSql(`alter table "payment_outbox" drop column if exists "retry_count";`);
  }
}
