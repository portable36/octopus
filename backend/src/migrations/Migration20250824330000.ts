import { Migration } from '@mikro-orm/migrations';

export class Migration20250824330000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      alter table "inventory_items"
        add column if not exists "unsellable_on_hand" int not null default 0;
    `);
    this.addSql(`
      alter table "inventory_items"
        drop constraint if exists inventory_items_unsellable_chk;
    `);
    this.addSql(`
      alter table "inventory_items"
        add constraint inventory_items_unsellable_chk check (unsellable_on_hand >= 0);
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      alter table "inventory_items"
        drop constraint if exists inventory_items_unsellable_chk;
    `);
    this.addSql(`
      alter table "inventory_items"
        drop column if exists "unsellable_on_hand";
    `);
  }
}
