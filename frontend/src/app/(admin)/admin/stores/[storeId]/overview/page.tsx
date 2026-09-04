'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiClientError } from '@/lib/api-client';
import { getAdminStoreOverview, type AdminStoreOverview } from '@/lib/admin-api';
import { useAccessToken } from '@/lib/use-access-token';

export default function AdminStoreOverviewPage() {
  const params = useParams<{ storeId: string }>();
  const token = useAccessToken();
  const storeId = params.storeId;
  const [overview, setOverview] = useState<AdminStoreOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !storeId) {
      setLoading(false);
      setError('Authentication token required.');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const data = await getAdminStoreOverview(token, storeId);
        if (!cancelled) {
          setOverview(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load overview.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, storeId]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading overview…</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!overview) return null;

  const { store, health, provisioning, metrics } = overview;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="border border-border bg-background p-4">
          <h2 className="text-sm font-medium">Identity</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Display name</dt>
              <dd>{store.profile.displayName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Slug</dt>
              <dd>{store.profile.slug}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Type</dt>
              <dd>{store.storeType ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd>{store.status}</dd>
            </div>
          </dl>
        </div>
        <div className="border border-border bg-background p-4">
          <h2 className="text-sm font-medium">Health · {health.score}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {health.checks.map((check) => (
              <li key={check.key} className="flex justify-between gap-3">
                <span>
                  {check.label}
                  <span className="block text-xs text-muted-foreground">{check.detail}</span>
                </span>
                <span
                  className={
                    check.ok
                      ? 'text-muted-foreground'
                      : check.severity === 'CRITICAL'
                        ? 'text-destructive'
                        : 'text-amber-700'
                  }
                >
                  {check.ok ? 'OK' : check.severity}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {provisioning ? (
        <section className="border border-border bg-background p-4 text-sm">
          <h2 className="font-medium">Provisioning summary</h2>
          <p className="mt-2 text-muted-foreground">
            Run {provisioning.status}
            {provisioning.lastError ? ` — ${provisioning.lastError}` : ''}
          </p>
          <Link
            href={`/admin/stores/${storeId}/provisioning`}
            className="mt-2 inline-block underline underline-offset-2"
          >
            Open provisioning tab
          </Link>
        </section>
      ) : null}

      <section className="border border-border bg-background p-4 text-sm">
        <h2 className="font-medium">Metrics</h2>
        <p className="mt-2 text-muted-foreground">{metrics.orders.reason}</p>
        <p className="text-muted-foreground">{metrics.revenue.reason}</p>
      </section>
    </div>
  );
}
