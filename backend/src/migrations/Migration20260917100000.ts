import { Migration } from '@mikro-orm/migrations';

export class Migration20260917100000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      alter table "notification_templates"
        drop constraint if exists "notification_templates_channel_chk";
    `);
    this.addSql(`
      alter table "notification_templates"
        add constraint "notification_templates_channel_chk"
        check (channel in ('EMAIL', 'IN_APP', 'SMS', 'PUSH'));
    `);

    this.addSql(`
      alter table "notifications"
        drop constraint if exists "notifications_channel_chk";
    `);
    this.addSql(`
      alter table "notifications"
        add constraint "notifications_channel_chk"
        check (channel in ('EMAIL', 'IN_APP', 'SMS', 'PUSH'));
    `);

    this.addSql(`
      create table if not exists "notification_push_devices" (
        "id" uuid primary key,
        "user_id" uuid not null,
        "platform" varchar(16) not null,
        "token" text not null,
        "token_fingerprint" varchar(64) not null,
        "label" varchar(64) null,
        "last_seen_at" timestamptz not null,
        "created_at" timestamptz not null,
        "revoked_at" timestamptz null,
        constraint notification_push_devices_platform_chk
          check (platform in ('web', 'android', 'ios'))
      );
    `);
    this.addSql(`
      create unique index if not exists "notification_push_devices_user_fp_uq"
        on "notification_push_devices" ("user_id", "token_fingerprint");
    `);
    this.addSql(`
      create index if not exists "notification_push_devices_user_active_idx"
        on "notification_push_devices" ("user_id")
        where "revoked_at" is null;
    `);

    this.addSql(`alter table "notification_push_devices" enable row level security;`);
    this.addSql(`alter table "notification_push_devices" force row level security;`);
    this.addSql(`
      create policy notification_push_devices_select on "notification_push_devices"
        for select
        using (
          app.is_platform_scope()
          or user_id::text = app.current_user_id()
        );
    `);
    this.addSql(`
      create policy notification_push_devices_write on "notification_push_devices"
        for all
        using (
          app.is_platform_scope()
          or user_id::text = app.current_user_id()
        )
        with check (
          app.is_platform_scope()
          or user_id::text = app.current_user_id()
        );
    `);
  }

  override async down(): Promise<void> {
    this.addSql(
      `drop policy if exists notification_push_devices_write on "notification_push_devices";`,
    );
    this.addSql(
      `drop policy if exists notification_push_devices_select on "notification_push_devices";`,
    );
    this.addSql(`drop table if exists "notification_push_devices";`);

    this.addSql(`
      alter table "notifications"
        drop constraint if exists "notifications_channel_chk";
    `);
    this.addSql(`
      alter table "notifications"
        add constraint "notifications_channel_chk"
        check (channel in ('EMAIL', 'IN_APP'));
    `);
    this.addSql(`
      alter table "notification_templates"
        drop constraint if exists "notification_templates_channel_chk";
    `);
    this.addSql(`
      alter table "notification_templates"
        add constraint "notification_templates_channel_chk"
        check (channel in ('EMAIL', 'IN_APP'));
    `);
  }
}
