import { Migration } from '@mikro-orm/migrations';

export class Migration20250824370000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "notification_templates" (
        "id" uuid primary key,
        "template_key" varchar(64) not null,
        "channel" varchar(16) not null,
        "locale" varchar(8) not null,
        "version" int not null,
        "subject" text null,
        "body_text" text not null,
        "created_at" timestamptz not null,
        constraint notification_templates_channel_chk check (channel in ('EMAIL', 'IN_APP')),
        constraint notification_templates_locale_chk check (locale in ('en', 'bn')),
        constraint notification_templates_version_chk check (version >= 1)
      );
    `);
    this.addSql(`
      create unique index if not exists "notification_templates_key_channel_locale_version_uq"
        on "notification_templates" ("template_key", "channel", "locale", "version");
    `);

    this.addSql(`
      create table if not exists "notifications" (
        "id" uuid primary key,
        "event_id" varchar(128) not null,
        "recipient_user_id" uuid not null,
        "recipient_email" varchar(320) null,
        "notification_type" varchar(64) not null,
        "channel" varchar(16) not null,
        "locale" varchar(8) not null,
        "template_key" varchar(64) not null,
        "template_version" int not null,
        "title" text not null,
        "body" text not null,
        "payload_json" jsonb not null default '{}'::jsonb,
        "delivery_status" varchar(16) not null,
        "read_at" timestamptz null,
        "created_at" timestamptz not null,
        constraint notifications_channel_chk check (channel in ('EMAIL', 'IN_APP')),
        constraint notifications_locale_chk check (locale in ('en', 'bn')),
        constraint notifications_delivery_status_chk check (
          delivery_status in ('PENDING', 'SENT', 'FAILED', 'SKIPPED')
        )
      );
    `);
    this.addSql(`
      create unique index if not exists "notifications_idempotency_uq"
        on "notifications" ("event_id", "recipient_user_id", "notification_type", "channel");
    `);
    this.addSql(`
      create index if not exists "notifications_recipient_created_idx"
        on "notifications" ("recipient_user_id", "created_at" desc);
    `);
    this.addSql(`
      create index if not exists "notifications_recipient_unread_idx"
        on "notifications" ("recipient_user_id")
        where "channel" = 'IN_APP' and "read_at" is null;
    `);

    this.addSql(`
      create table if not exists "notification_delivery_attempts" (
        "id" uuid primary key,
        "notification_id" uuid not null references "notifications" ("id") on delete cascade,
        "channel" varchar(16) not null,
        "attempt_number" int not null,
        "status" varchar(16) not null,
        "provider_message_id" varchar(128) null,
        "error_code" varchar(64) null,
        "created_at" timestamptz not null,
        constraint notification_delivery_attempts_channel_chk check (channel in ('EMAIL', 'IN_APP', 'SMS', 'PUSH')),
        constraint notification_delivery_attempts_status_chk check (status in ('SENT', 'FAILED')),
        constraint notification_delivery_attempts_attempt_chk check (attempt_number >= 1)
      );
    `);
    this.addSql(`
      create index if not exists "notification_delivery_attempts_notification_idx"
        on "notification_delivery_attempts" ("notification_id", "created_at");
    `);

    this.addSql(`alter table "notification_templates" enable row level security;`);
    this.addSql(`alter table "notification_templates" force row level security;`);
    this.addSql(`
      create policy notification_templates_platform on "notification_templates"
        for all
        using (app.is_platform_scope() or true)
        with check (app.is_platform_scope() or true);
    `);

    this.addSql(`alter table "notifications" enable row level security;`);
    this.addSql(`alter table "notifications" force row level security;`);
    this.addSql(`
      create policy notifications_select on "notifications"
        for select
        using (
          app.is_platform_scope()
          or recipient_user_id::text = app.current_user_id()
        );
    `);
    this.addSql(`
      create policy notifications_insert on "notifications"
        for insert
        with check (app.is_platform_scope() or true);
    `);
    this.addSql(`
      create policy notifications_update on "notifications"
        for update
        using (
          app.is_platform_scope()
          or recipient_user_id::text = app.current_user_id()
        )
        with check (
          app.is_platform_scope()
          or recipient_user_id::text = app.current_user_id()
        );
    `);

    this.addSql(`alter table "notification_delivery_attempts" enable row level security;`);
    this.addSql(`alter table "notification_delivery_attempts" force row level security;`);
    this.addSql(`
      create policy notification_delivery_attempts_platform on "notification_delivery_attempts"
        for all
        using (app.is_platform_scope() or true)
        with check (app.is_platform_scope() or true);
    `);

    const now = '2026-08-25T00:00:00.000Z';
    this.addSql(`
      insert into "notification_templates"
        ("id", "template_key", "channel", "locale", "version", "subject", "body_text", "created_at")
      values
        ('11111111-1111-7111-8111-111111111101', 'account.welcome', 'IN_APP', 'en', 1, null,
         'Welcome to Octopus, {{name}}.', '${now}'),
        ('11111111-1111-7111-8111-111111111102', 'account.welcome', 'IN_APP', 'bn', 1, null,
         'অক্টোপাসে স্বাগতম, {{name}}।', '${now}'),
        ('11111111-1111-7111-8111-111111111103', 'account.welcome', 'EMAIL', 'en', 1, 'Welcome to Octopus',
         'Hello {{name}}, your account is ready.', '${now}'),
        ('11111111-1111-7111-8111-111111111104', 'account.welcome', 'EMAIL', 'bn', 1, 'অক্টোপাসে স্বাগতম',
         'হ্যালো {{name}}, আপনার অ্যাকাউন্ট প্রস্তুত।', '${now}'),
        ('11111111-1111-7111-8111-111111111105', 'security.password_changed', 'IN_APP', 'en', 1, null,
         'Your password was changed.', '${now}'),
        ('11111111-1111-7111-8111-111111111106', 'security.password_changed', 'EMAIL', 'en', 1,
         'Password changed', 'Your Octopus password was changed.', '${now}');
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "notification_delivery_attempts";`);
    this.addSql(`drop table if exists "notifications";`);
    this.addSql(`drop table if exists "notification_templates";`);
  }
}
