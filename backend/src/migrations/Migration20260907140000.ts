import { Migration } from '@mikro-orm/migrations';

/** Allow configuration key `theme` for Phase 20.3 Website Control Center & Theme Customizer. */
export class Migration20260907140000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      alter table "configuration_documents"
        drop constraint if exists configuration_documents_key_chk;
    `);
    this.addSql(`
      alter table "configuration_documents"
        add constraint configuration_documents_key_chk
          check (key in ('general', 'branding', 'marketing', 'theme'));
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
          check (key in ('general', 'branding', 'marketing'));
    `);
  }
}
