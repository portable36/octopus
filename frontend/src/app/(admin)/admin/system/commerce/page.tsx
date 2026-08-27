'use client';

import Link from 'next/link';
import { useAccessToken } from '@/lib/use-access-token';
import { AdminPageHeader } from '@/components/layout/admin-page-header';

export default function AdminCommerceConfigPage() {
  const token = useAccessToken();
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Commerce config"
        description="COD and related commerce settings are edited on vendor and store detail pages via existing PATCH settings APIs."
      />
      <section className="space-y-3 border border-border p-4 text-sm">
        <h2 className="font-medium">Payment / COD</h2>
        <p className="text-muted-foreground">
          Enable COD and set min/max amounts (minor units) and reservation TTL on each vendor and
          store. Checkout requires both scopes enabled. No separate payment-provider admin UI yet.
        </p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <Link href={'/admin/vendors'} className="underline underline-offset-2">
              Vendors
            </Link>{' '}
            → open a vendor → COD settings
          </li>
          <li>
            <Link href={'/admin/stores'} className="underline underline-offset-2">
              Stores
            </Link>{' '}
            → open a store → COD settings
          </li>
        </ul>
      </section>
      <section className="space-y-2 border border-border p-4 text-sm">
        <h2 className="font-medium">Not available yet</h2>
        <ul className="list-inside list-disc space-y-1 text-muted-foreground">
          <li>
            Shipping / courier accounts — <code className="text-xs">CourierAccountStore</code> is
            internal; no public courier admin API.
          </li>
          <li>Tax / commission engines — deferred to later phases.</li>
        </ul>
      </section>
    </div>
  );
}
