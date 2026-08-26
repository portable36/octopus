import { Migration } from '@mikro-orm/migrations';

/** Allow configuration key `marketing` (Phase 18.6). */
export class Migration20250824410000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      alter table "configuration_documents"
        drop constraint if exists configuration_documents_key_chk;
    `);
    this.addSql(`
      alter table "configuration_documents"
        add constraint configuration_documents_key_chk
          check (key in ('general', 'branding', 'marketing'));
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      alter table "configuration_documents"
        drop constraint if exists configuration_documents_key_chk;
    `);
    this.addSql(`
      alter table "configuration_documents"
        add constraint configuration_documents_key_chk
          check (key in ('general', 'branding'));
    `);
  }
}
