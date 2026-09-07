'use client';

import { useEffect, useState } from 'react';
import { ApiClientError } from '@/lib/api-client';
import {
  getStoreSalesAnalytics,
  getVendorSalesAnalytics,
  type ScopedSalesAnalytics,
} from '@/lib/vendor-api';

function money(minor: number): string {
  return (minor / 100).toFixed(2);
}

type Props = {
  readonly vendorId?: string;
  readonly storeId?: string;
  readonly title?: string;
};

export function VendorSalesTrendsWidget({ vendorId, storeId, title }: Props) {
  const [data, setData] = useState<ScopedSalesAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!vendorId && !storeId) {
      setLoading(false);
      setError('Identifier required to load sales analytics.');
      return;
    }

    setLoading(true);
    let cancelled = false;

    void (async () => {
      try {
        const result = storeId
          ? await getStoreSalesAnalytics(storeId, days)
          : await getVendorSalesAnalytics(vendorId!, days);

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
  }, [days, retryCount, storeId, vendorId]);

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
  const totalCommissionMinor = data.summary.currencies.reduce(
    (sum, c) => sum + c.commissionMinor,
    0,
  );
  const netEarningsMinor = totalRevenueMinor - totalCommissionMinor;
  const maxDayRevenue = Math.max(...data.trends.map((t) => t.revenueMinor), 1);

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4 text-sm shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-foreground">
            {title ?? (storeId ? 'Store Sales & Orders' : 'Vendor Sales & Revenue Trends')}
          </h3>
          <p className="text-xs text-muted-foreground">
            Real-time performance rollups from completed orders
          </p>
        </div>
        <div className="flex gap-1 text-xs">
          <button
            type="button"
            className={`rounded px-2.5 py-1 font-medium transition-colors ${
              days === 7
                ? 'bg-primary text-primary-foreground'
                : 'border border-border text-muted-foreground hover:bg-muted'
            }`}
            onClick={() => setDays(7)}
          >
            7D
          </button>
          <button
            type="button"
            className={`rounded px-2.5 py-1 font-medium transition-colors ${
              days === 30
                ? 'bg-primary text-primary-foreground'
                : 'border border-border text-muted-foreground hover:bg-muted'
            }`}
            onClick={() => setDays(30)}
          >
            30D
          </button>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
        <div className="rounded border border-border bg-muted/30 p-2.5">
          <dt className="text-xs text-muted-foreground">Gross Revenue</dt>
          <dd className="text-base font-semibold">
            {money(totalRevenueMinor)}{' '}
            <span className="text-xs font-normal text-muted-foreground">{primaryCurrency}</span>
          </dd>
        </div>
        <div className="rounded border border-border bg-muted/30 p-2.5">
          <dt className="text-xs text-muted-foreground">Est. Net Revenue</dt>
          <dd className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
            {money(netEarningsMinor)}{' '}
            <span className="text-xs font-normal text-muted-foreground">{primaryCurrency}</span>
          </dd>
        </div>
        <div className="rounded border border-border bg-muted/30 p-2.5">
          <dt className="text-xs text-muted-foreground">Avg. Order Value</dt>
          <dd className="text-base font-semibold">
            {money(data.aovMinor)}{' '}
            <span className="text-xs font-normal text-muted-foreground">{primaryCurrency}</span>
          </dd>
        </div>
        <div className="rounded border border-border bg-muted/30 p-2.5">
          <dt className="text-xs text-muted-foreground">Paid Orders / Total</dt>
          <dd className="text-base font-semibold">
            {data.summary.paidOrderCount}{' '}
            <span className="text-xs font-normal text-muted-foreground">
              / {data.summary.orderCount}
            </span>
          </dd>
        </div>
      </dl>

      {/* Mini daily trend bar visualization */}
      {data.trends.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">Daily Revenue</span>
            <span className="text-muted-foreground">Last {days} days</span>
          </div>
          <div className="flex h-16 items-end gap-1 overflow-x-auto rounded border border-border/60 bg-muted/10 p-2">
            {data.trends.map((point) => {
              const heightPercent = Math.max(
                8,
                Math.round((point.revenueMinor / maxDayRevenue) * 100),
              );
              return (
                <div
                  key={point.date}
                  className="group relative flex flex-1 flex-col items-center"
                  title={`${point.date}: ${money(point.revenueMinor)} ${primaryCurrency} (${point.paidOrderCount} paid orders)`}
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
          <p className="text-xs font-medium text-muted-foreground">Payment Methods Breakdown</p>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {data.paymentMethods.map((pm) => (
              <div
                key={pm.paymentMethod}
                className="flex items-center justify-between rounded border border-border/60 bg-background px-2.5 py-1.5 text-xs"
              >
                <span className="font-medium">{pm.paymentMethod}</span>
                <span className="text-muted-foreground">
                  {money(pm.revenueMinor)} {primaryCurrency} ({pm.paidOrderCount} orders)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
