'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ApiClientError } from '@/lib/api-client';
import {
  getAdminStoreReportSummary,
  type AdminStorePerformanceRow,
} from '@/lib/admin-api';
import { useAccessToken } from '@/lib/use-access-token';

function formatMinor(amount: number, currencyCode: string): string {
  return `${(amount / 100).toFixed(2)} ${currencyCode}`;
}

export default function AdminStoreAnalyticsPage() {
  const params = useParams<{ storeId: string }>();
  const token = useAccessToken();
  const storeId = params.storeId;
  const [row, setRow] = useState<AdminStorePerformanceRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!token || !storeId) return;
    try {
      const rows = await getAdminStoreReportSummary(token);
      setRow(rows.find((r) => r.storeId === storeId) ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load store analytics.');
      setRow(null);
    } finally {
      setLoaded(true);
    }
  }, [token, storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!loaded && !error) {
    return <p className="text-sm text-muted-foreground">Loading analytics…</p>;
  }

  const primary = row?.currencies[0];

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <section className="space-y-3 border border-border bg-background p-4">
        <div>
          <h2 className="text-sm font-medium">Store performance</h2>
          <p className="text-xs text-muted-foreground">
            First-party reporting facts (not GA4). Full board:{' '}
            <Link href="/admin/system/reports" className="underline underline-offset-2">
              Reports
            </Link>
            .
          </p>
        </div>
        {!row ? (
          <p className="text-sm text-muted-foreground">No order facts for this store yet.</p>
        ) : (
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Orders</dt>
              <dd className="font-medium">{row.orderCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Paid orders</dt>
              <dd className="font-medium">{row.paidOrderCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Revenue</dt>
              <dd className="font-medium">
                {primary
                  ? formatMinor(primary.revenueMinor, primary.currencyCode)
                  : String(row.revenueMinor)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Commission</dt>
              <dd className="font-medium">
                {primary
                  ? formatMinor(primary.commissionMinor, primary.currencyCode)
                  : String(row.commissionMinor)}
              </dd>
            </div>
          </dl>
        )}
      </section>

      <section className="space-y-2 border border-border bg-background p-4">
        <h2 className="text-sm font-medium">SEO & marketing</h2>
        <ul className="list-inside list-disc text-xs text-muted-foreground">
          <li>
            Product / category overrides:{' '}
            <Link href="/admin/system/seo" className="underline underline-offset-2">
              SEO admin
            </Link>
          </li>
          <li>
            Platform marketing tags:{' '}
            <Link href="/admin/system/marketing" className="underline underline-offset-2">
              Marketing
            </Link>{' '}
            (GEM / Meta stay platform-scoped)
          </li>
        </ul>
      </section>
    </div>
  );
}
