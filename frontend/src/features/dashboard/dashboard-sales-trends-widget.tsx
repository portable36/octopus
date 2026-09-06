'use client';

import { useEffect, useState } from 'react';
import { useAccessToken } from '@/lib/use-access-token';
import { ApiClientError } from '@/lib/api-client';
import { getAdminSalesTrends, type AdminSalesAnalytics } from '@/lib/admin-api';

function money(minor: number): string {
  return (minor / 100).toFixed(2);
}

export function DashboardSalesTrendsWidget() {
  const token = useAccessToken();
  const [data, setData] = useState<AdminSalesAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    if (!token) {
      setLoading(false);
      setError('Sign in required to load sales trends.');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const result = await getAdminSalesTrends(token, days);
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load sales analytics.');
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
  }, [days, retryCount, token]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading sales analytics…</p>;
  }

  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
        <button
          type="button"
          className="min-h-11 rounded-md border border-border px-3 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setRetryCount((count) => count + 1)}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground">No sales data available.</p>;
  }

  const primaryCurrency = data.summary.currencies[0]?.currencyCode || 'BDT';
  const totalRevenueMinor = data.summary.currencies.reduce((sum, c) => sum + c.revenueMinor, 0);
  const maxDayRevenue = Math.max(...data.trends.map((t) => t.revenueMinor), 1);

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Real-time rollups from reporting facts</p>
        <div className="flex gap-1 text-xs">
          <button
            type="button"
            className={`rounded px-2 py-1 ${days === 7 ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:bg-muted'}`}
            onClick={() => setDays(7)}
          >
            7D
          </button>
          <button
            type="button"
            className={`rounded px-2 py-1 ${days === 30 ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:bg-muted'}`}
            onClick={() => setDays(30)}
          >
            30D
          </button>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded border border-border bg-muted/30 p-2">
          <dt className="text-xs text-muted-foreground">Revenue</dt>
          <dd className="text-base font-semibold">
            {money(totalRevenueMinor)}{' '}
            <span className="text-xs font-normal">{primaryCurrency}</span>
          </dd>
        </div>
        <div className="rounded border border-border bg-muted/30 p-2">
          <dt className="text-xs text-muted-foreground">AOV</dt>
          <dd className="text-base font-semibold">
            {money(data.aovMinor)} <span className="text-xs font-normal">{primaryCurrency}</span>
          </dd>
        </div>
        <div className="rounded border border-border bg-muted/30 p-2">
          <dt className="text-xs text-muted-foreground">Paid Ratio</dt>
          <dd className="text-base font-semibold">
            {data.summary.orderCount > 0
              ? `${Math.round((data.summary.paidOrderCount / data.summary.orderCount) * 100)}%`
              : '0%'}
          </dd>
        </div>
      </dl>

      {/* Mini daily trend bar visualization */}
      {data.trends.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Daily Revenue Trend</p>
          <div className="flex h-14 items-end gap-1 overflow-x-auto pt-2">
            {data.trends.map((point) => {
              const heightPercent = Math.max(
                8,
                Math.round((point.revenueMinor / maxDayRevenue) * 100),
              );
              return (
                <div
                  key={point.date}
                  className="group relative flex flex-1 flex-col items-center"
                  title={`${point.date}: ${money(point.revenueMinor)} ${primaryCurrency} (${point.paidOrderCount} orders)`}
                >
                  <div
                    className="w-full rounded-t bg-primary/80 transition-all hover:bg-primary"
                    style={{ height: `${heightPercent}%` }}
                  />
                  <span className="mt-1 hidden text-[9px] text-muted-foreground group-hover:block">
                    {point.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payment methods breakdown */}
      {data.paymentMethods.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <p className="text-xs font-medium text-muted-foreground">Payment Gateways & Methods</p>
          <div className="space-y-1">
            {data.paymentMethods.map((pm) => (
              <div
                key={pm.paymentMethod}
                className="flex items-center justify-between rounded border border-border/60 px-2 py-1 text-xs"
              >
                <span className="font-medium">{pm.paymentMethod}</span>
                <span className="text-muted-foreground">
                  {money(pm.revenueMinor)} {primaryCurrency} ({pm.paidOrderCount} paid)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
