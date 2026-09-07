import { Migration } from '@mikro-orm/migrations';

/** Phase 22 — query performance indexes for audit_events (store, vendor, actor, resource, action). */
export class Migration20260907120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create index if not exists "audit_events_store_created_idx"
        on "audit_events" ("store_id", "created_at" desc);
    `);
    this.addSql(`
      create index if not exists "audit_events_vendor_created_idx"
        on "audit_events" ("vendor_id", "created_at" desc);
    `);
    this.addSql(`
      create index if not exists "audit_events_actor_created_idx"
        on "audit_events" ("actor_user_id", "created_at" desc);
    `);
    this.addSql(`
      create index if not exists "audit_events_resource_idx"
        on "audit_events" ("resource_type", "resource_id");
    `);
    this.addSql(`
      create index if not exists "audit_events_action_created_idx"
        on "audit_events" ("action", "created_at" desc);
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "audit_events_action_created_idx";`);
    this.addSql(`drop index if exists "audit_events_resource_idx";`);
    this.addSql(`drop index if exists "audit_events_actor_created_idx";`);
    this.addSql(`drop index if exists "audit_events_vendor_created_idx";`);
    this.addSql(`drop index if exists "audit_events_store_created_idx";`);
  }
}
