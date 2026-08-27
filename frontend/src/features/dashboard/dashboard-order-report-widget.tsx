'use client';

import { useEffect, useState } from 'react';
import { useAccessToken } from '@/lib/use-access-token';
import { ApiClientError } from '@/lib/api-client';
import { getAdminOrderReportSummary, type AdminOrderReportSummary } from '@/lib/admin-api';

function money(minor: number, currency: string): string {
  return `${(minor / 100).toFixed(2)} ${currency}`;
}

export function DashboardOrderReportWidget() {
  const token = useAccessToken();
  const [summary, setSummary] = useState<AdminOrderReportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('Sign in required to load order report.');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const data = await getAdminOrderReportSummary(token);
        if (!cancelled) {
          setSummary(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load order report.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading report…</p>;
  }
  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (!summary) {
    return null;
  }

  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted-foreground">
        From <code className="text-xs">reporting_order_facts</code> (may lag outbox projection).
      </p>
      <dl className="grid grid-cols-2 gap-3">
        <div>
          <dt className="text-muted-foreground">Orders</dt>
          <dd className="text-xl font-semibold">{summary.orderCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Paid</dt>
          <dd className="text-xl font-semibold">{summary.paidOrderCount}</dd>
        </div>
      </dl>
      {summary.currencies.length === 0 ? (
        <p className="text-muted-foreground">No projected orders yet.</p>
      ) : (
        <ul className="space-y-2">
          {summary.currencies.map((row) => (
            <li key={row.currencyCode} className="rounded-md border border-border px-3 py-2">
              <p className="font-medium">{row.currencyCode}</p>
              <p className="text-muted-foreground">
                Revenue {money(row.revenueMinor, row.currencyCode)} · Commission{' '}
                {money(row.commissionMinor, row.currencyCode)} · {row.paidOrderCount}/
                {row.orderCount} paid
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
