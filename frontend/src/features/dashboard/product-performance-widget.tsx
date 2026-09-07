'use client';

import { useEffect, useState } from 'react';
import { ApiClientError } from '@/lib/api-client';
import { getAdminTopProducts, type AdminProductPerformanceRow } from '@/lib/admin-api';
import {
  getStoreTopProducts,
  getVendorTopProducts,
  type ProductPerformanceRow,
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

export function ProductPerformanceWidget({ vendorId, storeId, token, title }: Props) {
  const [items, setItems] = useState<
    readonly (ProductPerformanceRow | AdminProductPerformanceRow)[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!vendorId && !storeId && !token) {
      setLoading(false);
      setError('Identifier or auth token required to load product analytics.');
      return;
    }

    setLoading(true);
    let cancelled = false;

    void (async () => {
      try {
        let result: readonly (ProductPerformanceRow | AdminProductPerformanceRow)[];
        if (token) {
          result = await getAdminTopProducts(token, days, 10);
        } else if (storeId) {
          result = await getStoreTopProducts(storeId, days, 10);
        } else {
          result = await getVendorTopProducts(vendorId!, days, 10);
        }

        if (!cancelled) {
          setItems(result);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError ? err.message : 'Failed to load product performance.',
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
    return <p className="text-sm text-muted-foreground">Loading product performance…</p>;
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

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{title ?? 'Top-Selling Products'}</h3>
          <p className="text-xs text-muted-foreground">Ranked by revenue and units sold</p>
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

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No product sales recorded in the selected period.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b text-xs uppercase text-muted-foreground">
              <tr>
                <th scope="col" className="py-2 pr-2">
                  #
                </th>
                <th scope="col" className="py-2 pr-4">
                  Product / Variant
                </th>
                <th scope="col" className="py-2 pr-4 text-right">
                  Units Sold
                </th>
                <th scope="col" className="py-2 pr-4 text-right">
                  Orders
                </th>
                <th scope="col" className="py-2 text-right">
                  Total Revenue
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {items.map((item, index) => (
                <tr key={`${item.productId}-${item.variantId}`} className="hover:bg-muted/50">
                  <td className="py-2.5 pr-2 font-medium text-muted-foreground">{index + 1}</td>
                  <td className="py-2.5 pr-4">
                    <p className="font-mono text-xs font-semibold text-foreground">
                      {item.productId.slice(0, 8)}…
                    </p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      var: {item.variantId.slice(0, 8)}…
                    </p>
                  </td>
                  <td className="py-2.5 pr-4 text-right font-medium">{item.unitsSold}</td>
                  <td className="py-2.5 pr-4 text-right text-muted-foreground">
                    {item.orderCount}
                  </td>
                  <td className="py-2.5 text-right font-semibold">
                    {item.currencyCode} {money(item.revenueMinor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
