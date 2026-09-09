import { Migration } from '@mikro-orm/migrations';

export class Migration20260909200000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      alter table "return_requests"
        add column if not exists "return_shipment_id" uuid null,
        add column if not exists "return_tracking_code" varchar(64) null;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      alter table "return_requests"
        drop column if exists "return_shipment_id",
        drop column if exists "return_tracking_code";
    `);
  }
}
