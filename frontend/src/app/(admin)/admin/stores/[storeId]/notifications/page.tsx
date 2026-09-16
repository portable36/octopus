'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function AdminStoreNotificationsPage() {
  const params = useParams<{ storeId: string }>();
  const storeId = params.storeId;

  return (
    <div className="space-y-4">
      <section className="space-y-3 border border-border bg-background p-4">
        <div>
          <h2 className="text-sm font-medium">Notifications (platform-scoped)</h2>
          <p className="text-xs text-muted-foreground">
            Delivery templates, email queue, and user preference gates are platform-owned. This
            store does not host a separate notification Settings key.
          </p>
        </div>
        <p className="text-sm">
          <Link href="/admin/system/notifications" className="underline underline-offset-2">
            Open notifications hub →
          </Link>
        </p>
      </section>

      <section className="space-y-2 border border-border bg-background p-4">
        <h2 className="text-sm font-medium">Related</h2>
        <ul className="list-inside list-disc text-xs text-muted-foreground">
          <li>
            <Link href="/admin/system/health" className="underline underline-offset-2">
              System health
            </Link>{' '}
            — Redis / queue readiness for{' '}
            <code className="text-[11px]">octopus.email</code>
          </li>
          <li>
            Store id <code className="font-mono text-[11px]">{storeId}</code> appears on order
            snapshots that drive transactional notify recipients.
          </li>
        </ul>
      </section>
    </div>
  );
}
