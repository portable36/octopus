'use client';

import { useEffect, useState } from 'react';
import { ApiClientError } from '@/lib/api-client';
import { getAdminRefundSummary, type AdminRefundReportSummary } from '@/lib/admin-api';
import {
  getStoreRefundSummary,
  getVendorRefundSummary,
  type RefundReportSummary,
} from '@/lib/vendor-api';

function money(minor: number): string {
  return (minor / 100).toFixed(2);
}

type Props = {
  readonly vendorId?: string;
  readonly storeId?: string;
  readonly token?: string;
  readonly title?: string;
};

export function RefundAnalyticsWidget({ vendorId, storeId, token, title }: Props) {
  const [data, setData] = useState<RefundReportSummary | AdminRefundReportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!vendorId && !storeId && !token) {
      setLoading(false);
      setError('Identifier or auth token required to load refund analytics.');
      return;
    }

    setLoading(true);
    let cancelled = false;

    void (async () => {
      try {
        let result: RefundReportSummary | AdminRefundReportSummary;
        if (token) {
          result = await getAdminRefundSummary(token, days);
        } else if (storeId) {
          result = await getStoreRefundSummary(storeId, days);
        } else {
          result = await getVendorRefundSummary(vendorId!, days);
        }

        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError ? err.message : 'Failed to load refund analytics.',
          );
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
  }, [days, retryCount, storeId, token, vendorId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading refund analytics…</p>;
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
    return <p className="text-sm text-muted-foreground">No refund analytics available.</p>;
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{title ?? 'Refund & Return Analytics'}</h3>
          <p className="text-xs text-muted-foreground">
            Total volume, rates, and method distribution
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-md border p-0.5 text-xs">
          <button
            type="button"
            className={`min-h-8 rounded px-2.5 py-1 font-medium transition-colors ${
              days === 7
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted text-muted-foreground'
            }`}
            onClick={() => setDays(7)}
          >
            7D
          </button>
          <button
            type="button"
            className={`min-h-8 rounded px-2.5 py-1 font-medium transition-colors ${
              days === 30
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted text-muted-foreground'
            }`}
            onClick={() => setDays(30)}
          >
            30D
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-md border p-3">
          <p className="text-xs font-medium text-muted-foreground">Total Refunded</p>
          <p className="mt-1 text-xl font-bold">
            {data.primaryCurrency} {money(data.totalRefundedMinor)}
          </p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs font-medium text-muted-foreground">Refund Count</p>
          <p className="mt-1 text-xl font-bold">{data.totalRefundCount}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs font-medium text-muted-foreground">Refund Rate</p>
          <p className="mt-1 text-xl font-bold">{data.refundRatePercent}%</p>
        </div>
      </div>

      {data.refundsByMethod.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Refunds by Gateway
          </h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {data.refundsByMethod.map((pm) => (
              <div
                key={pm.paymentMethod}
                className="flex items-center justify-between rounded border bg-muted/30 px-3 py-2 text-xs"
              >
                <span className="font-medium">{pm.paymentMethod}</span>
                <span className="text-muted-foreground">
                  {data.primaryCurrency} {money(pm.amountMinor)} ({pm.refundCount})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.recentRefunds.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Refunds
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b text-muted-foreground">
                <tr>
                  <th scope="col" className="py-1.5 pr-2">
                    Order ID
                  </th>
                  <th scope="col" className="py-1.5 pr-2">
                    Method
                  </th>
                  <th scope="col" className="py-1.5 pr-2">
                    Date
                  </th>
                  <th scope="col" className="py-1.5 text-right">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data.recentRefunds.map((ref) => (
                  <tr key={ref.refundId}>
                    <td className="py-1.5 pr-2 font-mono text-[11px] text-muted-foreground">
                      {ref.orderId.slice(0, 8)}…
                    </td>
                    <td className="py-1.5 pr-2 font-medium">{ref.paymentMethod ?? 'MANUAL'}</td>
                    <td className="py-1.5 pr-2 text-muted-foreground">
                      {ref.createdAt.slice(0, 10)}
                    </td>
                    <td className="py-1.5 text-right font-semibold">
                      {ref.currencyCode} {money(ref.amountMinor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
