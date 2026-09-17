import { Migration } from '@mikro-orm/migrations';

/** Platform manual IP denylist for admin Security CRUD + request middleware. */
export class Migration20260917120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "blocked_ips" (
        "id" uuid primary key,
        "ip_cidr" varchar(64) not null,
        "reason" text null,
        "expires_at" timestamptz null,
        "is_active" boolean not null default true,
        "created_by" uuid null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint blocked_ips_ip_cidr_uq unique ("ip_cidr")
      );
    `);
    this.addSql(`
      create index if not exists "blocked_ips_active_expires_idx"
        on "blocked_ips" ("is_active", "expires_at");
    `);

    this.addSql(`alter table "blocked_ips" enable row level security;`);
    this.addSql(`alter table "blocked_ips" force row level security;`);
    // SELECT open so pre-auth middleware can warm/fallback without platform scope.
    this.addSql(`
      create policy blocked_ips_select on "blocked_ips"
        for select
        using (true);
    `);
    this.addSql(`
      create policy blocked_ips_insert on "blocked_ips"
        for insert
        with check (app.is_platform_scope());
    `);
    this.addSql(`
      create policy blocked_ips_update on "blocked_ips"
        for update
        using (app.is_platform_scope())
        with check (app.is_platform_scope());
    `);
    this.addSql(`
      create policy blocked_ips_delete on "blocked_ips"
        for delete
        using (app.is_platform_scope());
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop policy if exists blocked_ips_delete on "blocked_ips";`);
    this.addSql(`drop policy if exists blocked_ips_update on "blocked_ips";`);
    this.addSql(`drop policy if exists blocked_ips_insert on "blocked_ips";`);
    this.addSql(`drop policy if exists blocked_ips_select on "blocked_ips";`);
    this.addSql(`drop table if exists "blocked_ips";`);
  }
}
