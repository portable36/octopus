'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiClientError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { listStoreLowStockItems, type LowStockInventoryItem } from '@/lib/vendor-api';

type Props = {
  readonly storeId: string;
  readonly onQuickRestock?: (variantId: string, warehouseId: string) => void;
};

export function LowStockAlertsWidget({ storeId, onQuickRestock }: Props) {
  const [items, setItems] = useState<readonly LowStockInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const loadAlerts = useCallback(async () => {
    if (!storeId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listStoreLowStockItems(storeId, 50);
      setItems(data);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load stock alerts.');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts, retryCount]);

  if (loading) {
    return (
      <div className="rounded-md border border-border bg-card p-4 text-xs text-muted-foreground">
        Checking stock thresholds…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-between rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
        <span>{error}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setRetryCount((c) => c + 1)}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-800 dark:text-emerald-300">
        <div className="flex items-center gap-2">
          <span aria-hidden="true">✓</span>
          <span>All monitored items in this store are healthy and above low-stock thresholds.</span>
        </div>
        <button
          type="button"
          className="text-xs underline-offset-2 hover:underline"
          onClick={() => setRetryCount((c) => c + 1)}
        >
          Check again
        </button>
      </div>
    );
  }

  const outOfStockCount = items.filter((i) => i.stockStatus === 'OUT_OF_STOCK').length;
  const lowStockCount = items.filter((i) => i.stockStatus === 'LOW_STOCK').length;

  return (
    <div className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 text-sm shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base" aria-hidden="true">
            ⚠️
          </span>
          <div>
            <h4 className="font-semibold text-amber-900 dark:text-amber-200">
              Low-Stock &amp; Depleted Inventory Alerts ({items.length})
            </h4>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {outOfStockCount > 0 && `${outOfStockCount} out-of-stock`}
              {outOfStockCount > 0 && lowStockCount > 0 && ' · '}
              {lowStockCount > 0 && `${lowStockCount} below minimum threshold`}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="rounded border border-amber-500/30 bg-background px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
          onClick={() => setRetryCount((c) => c + 1)}
        >
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto rounded border border-border bg-background">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-border bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Variant ID</th>
              <th className="px-3 py-2 font-medium">Warehouse</th>
              <th className="px-3 py-2 font-medium">On Hand</th>
              <th className="px-3 py-2 font-medium">Available</th>
              <th className="px-3 py-2 font-medium">Threshold</th>
              <th className="px-3 py-2 font-medium">Status</th>
              {onQuickRestock && <th className="px-3 py-2 font-medium text-right">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-muted/20">
                <td className="px-3 py-2 font-mono">{item.variantId}</td>
                <td className="px-3 py-2">{item.warehouseName}</td>
                <td className="px-3 py-2 tabular-nums">{item.onHand}</td>
                <td className="px-3 py-2 tabular-nums font-medium">{item.available}</td>
                <td className="px-3 py-2 tabular-nums text-muted-foreground">
                  {item.lowStockThreshold > 0 ? item.lowStockThreshold : '—'}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      item.stockStatus === 'OUT_OF_STOCK'
                        ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {item.stockStatus === 'OUT_OF_STOCK' ? 'OUT OF STOCK' : 'LOW STOCK'}
                  </span>
                </td>
                {onQuickRestock && (
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      className="rounded bg-primary/10 px-2 py-1 font-medium text-primary hover:bg-primary/20"
                      onClick={() => onQuickRestock(item.variantId, item.warehouseId)}
                    >
                      Receive Stock
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
