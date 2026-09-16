'use client';

import Link from 'next/link';
import { AdminPageHeader } from '@/components/layout/admin-page-header';

export default function AdminSystemNotificationsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Notifications"
        description="Platform delivery plane for transactional and marketing messages. Preferences are user-scoped; there is no store-owned notification config yet."
      />

      <section className="space-y-3 border border-border bg-background p-4">
        <h2 className="text-sm font-medium">What runs today</h2>
        <ul className="list-inside list-disc text-sm text-muted-foreground">
          <li>
            In-app inbox + prefs:{' '}
            <code className="text-xs">GET/PATCH /notifications</code> and{' '}
            <code className="text-xs">/notifications/preferences</code>
          </li>
          <li>
            Email jobs on queue <code className="text-xs">octopus.email</code> (
            <code className="text-xs">NotificationDeliver</code>); log stub provider by default
          </li>
          <li>
            Marketing channel gated by user prefs (
            <code className="text-xs">marketing_email</code> /{' '}
            <code className="text-xs">marketing_in_app</code>, default off)
          </li>
        </ul>
      </section>

      <section className="space-y-2 border border-border bg-background p-4">
        <h2 className="text-sm font-medium">Related surfaces</h2>
        <ul className="list-inside list-disc text-xs text-muted-foreground">
          <li>
            Queue / dependency health:{' '}
            <Link href="/admin/system/health" className="underline underline-offset-2">
              System health
            </Link>{' '}
            ·{' '}
            <Link href="/admin/system/alerts" className="underline underline-offset-2">
              Ops alerts
            </Link>
          </li>
          <li>
            Marketing tags (GTM / GA4 / Meta):{' '}
            <Link href="/admin/system/marketing" className="underline underline-offset-2">
              Marketing
            </Link>
          </li>
          <li>
            Store onboarding channel checkboxes are provisioning draft fields only — they do not
            override platform delivery rules.
          </li>
        </ul>
      </section>
    </div>
  );
}
