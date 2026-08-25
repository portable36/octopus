import { Migration } from '@mikro-orm/migrations';

export class Migration20250824380000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "notification_preferences" (
        "user_id" uuid primary key,
        "marketing_email" boolean not null default false,
        "marketing_in_app" boolean not null default false,
        "updated_at" timestamptz not null
      );
    `);
    this.addSql(`alter table "notification_preferences" enable row level security;`);
    this.addSql(`alter table "notification_preferences" force row level security;`);
    this.addSql(`
      create policy notification_preferences_select on "notification_preferences"
        for select
        using (
          app.is_platform_scope()
          or user_id::text = app.current_user_id()
        );
    `);
    this.addSql(`
      create policy notification_preferences_write on "notification_preferences"
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

    const now = '2026-08-25T00:00:00.000Z';
    this.addSql(`
      insert into "notification_templates"
        ("id", "template_key", "channel", "locale", "version", "subject", "body_text", "created_at")
      values
        ('11111111-1111-7111-8111-111111111111', 'payment.cod_collected', 'IN_APP', 'en', 1, null,
         'COD collected for order {{orderNumber}} ({{amountLabel}}).', '${now}'),
        ('11111111-1111-7111-8111-111111111112', 'payment.cod_collected', 'EMAIL', 'en', 1,
         'COD collected — {{orderNumber}}',
         'We recorded cash on delivery for order {{orderNumber}} ({{amountLabel}}).', '${now}'),
        ('11111111-1111-7111-8111-111111111113', 'payment.refund_completed', 'IN_APP', 'en', 1, null,
         'Refund completed for order {{orderNumber}} ({{amountLabel}}).', '${now}'),
        ('11111111-1111-7111-8111-111111111114', 'payment.refund_completed', 'EMAIL', 'en', 1,
         'Refund completed — {{orderNumber}}',
         'Your refund for order {{orderNumber}} ({{amountLabel}}) is complete.', '${now}'),
        ('11111111-1111-7111-8111-111111111115', 'fulfillment.shipment_delivered', 'IN_APP', 'en', 1, null,
         'Order {{orderNumber}} was delivered.', '${now}'),
        ('11111111-1111-7111-8111-111111111116', 'fulfillment.shipment_delivered', 'EMAIL', 'en', 1,
         'Delivered — {{orderNumber}}',
         'Your shipment for order {{orderNumber}} was marked delivered.', '${now}')
      on conflict ("template_key", "channel", "locale", "version") do nothing;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "notification_preferences";`);
  }
}
