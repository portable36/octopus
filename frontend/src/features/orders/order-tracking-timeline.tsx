'use client';

import { useEffect, useState, useCallback } from 'react';
import { ApiClientError } from '@/lib/api-client';
import { fetchOrderTracking, type OrderTrackingTimeline } from '@/lib/account-api';

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function OrderTrackingTimelineWidget({ orderId }: { orderId: string }) {
  const [tracking, setTracking] = useState<OrderTrackingTimeline | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const data = await fetchOrderTracking(orderId);
      setTracking(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : 'Could not load tracking information.',
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const copyTracking = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading shipment tracking timeline…</p>;
  }

  if (error) {
    return (
      <div className="space-y-2 rounded-md border border-border p-4">
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded border border-border px-3 py-1 text-xs hover:bg-muted"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!tracking) return null;

  const activeShipment = tracking.shipments[tracking.shipments.length - 1];

  return (
    <div className="space-y-6 rounded-lg border border-border p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="text-base font-semibold">Shipment & Delivery Timeline</h2>
          <p className="text-xs text-muted-foreground">
            Real-time status updates synced with courier dispatch
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Refresh Status
        </button>
      </div>

      {/* Courier details card if shipment exists */}
      {activeShipment && (
        <div className="grid gap-3 rounded-md border border-border/80 bg-muted/20 p-4 text-xs sm:grid-cols-3">
          <div>
            <span className="font-medium text-muted-foreground">Courier Partner</span>
            <p className="mt-0.5 text-sm font-semibold capitalize">
              {activeShipment.provider.toLowerCase()}
            </p>
            <p className="text-muted-foreground">{activeShipment.providerStatus}</p>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">Tracking Code</span>
            <div className="mt-0.5 flex items-center gap-1.5">
              <code className="text-sm font-mono font-medium">
                {activeShipment.trackingCode || activeShipment.providerConsignmentId || 'Pending'}
              </code>
              {activeShipment.trackingCode && (
                <button
                  type="button"
                  onClick={() => copyTracking(activeShipment.trackingCode!)}
                  className="rounded border border-border px-1.5 py-0.5 text-[10px] hover:bg-muted"
                  title="Copy tracking code"
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">Delivery To</span>
            <p className="mt-0.5 truncate font-medium">{activeShipment.recipientName}</p>
            <p className="truncate text-muted-foreground">{activeShipment.recipientAddress}</p>
          </div>
        </div>
      )}

      {/* Vertical Stepper Timeline */}
      <ol className="relative ml-3 space-y-6 border-l-2 border-border/80 pl-6 text-sm">
        {tracking.milestones.map((m, idx) => {
          const isDone = m.completed;
          const isCurrent = m.current;

          return (
            <li key={`${m.code}-${idx}`} className="relative">
              {/* Dot Icon */}
              <span
                className={`absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  isDone
                    ? 'bg-emerald-600 text-white'
                    : isCurrent
                      ? 'border-2 border-primary bg-background text-primary ring-4 ring-primary/20'
                      : 'border border-border bg-muted text-muted-foreground'
                }`}
                aria-hidden="true"
              >
                {isDone ? '✓' : idx + 1}
              </span>

              <div className="flex flex-col gap-0.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`font-medium ${
                      isDone || isCurrent ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {m.title}
                  </span>
                  {m.completed && (
                    <time className="text-[11px] text-muted-foreground">
                      {formatTimestamp(m.timestamp)}
                    </time>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{m.description}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
