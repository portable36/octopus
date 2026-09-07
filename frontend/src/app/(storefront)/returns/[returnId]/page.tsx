'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import {
  cancelPublicReturn,
  getPublicReturnTimeline,
  type ReturnTimelineMilestone,
  type ReturnTimelineResponse,
} from '@/lib/returns-api';
import { formatMoney } from '@/lib/storefront-api';

function formatTimestamp(iso: string | null): string {
  if (!iso) return '';
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

function getStatusBadge(status: string) {
  switch (status) {
    case 'REQUESTED':
      return {
        label: 'Requested',
        bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
      };
    case 'UNDER_REVIEW':
      return {
        label: 'Under Review',
        bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
      };
    case 'APPROVED':
    case 'AWAITING_RETURN':
      return {
        label: 'Approved / Ship Items',
        bg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300',
      };
    case 'RECEIVED':
      return {
        label: 'Items Received',
        bg: 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300',
      };
    case 'INSPECTING':
      return {
        label: 'Inspecting',
        bg: 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
      };
    case 'INSPECTION_APPROVED':
      return {
        label: 'Inspection Passed',
        bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
      };
    case 'INSPECTION_REJECTED':
      return {
        label: 'Inspection Failed',
        bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300',
      };
    case 'REJECTED':
      return {
        label: 'Rejected',
        bg: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
      };
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        bg: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300',
      };
    default:
      return {
        label: status,
        bg: 'bg-secondary text-secondary-foreground',
      };
  }
}

function getMilestoneStateIcon(state: ReturnTimelineMilestone['state']) {
  switch (state) {
    case 'COMPLETED':
      return (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold shadow-sm">
          ✓
        </span>
      );
    case 'CURRENT':
      return (
        <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold shadow-sm">
          <span className="absolute -inset-1 animate-ping rounded-full bg-blue-400 opacity-30" />●
        </span>
      );
    case 'REJECTED':
      return (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-white text-xs font-bold shadow-sm">
          ✕
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted-foreground text-white text-xs font-bold shadow-sm">
          —
        </span>
      );
    case 'UPCOMING':
    default:
      return (
        <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-border bg-background text-xs font-medium text-muted-foreground">
          ○
        </span>
      );
  }
}

function ReturnTimelineDetail() {
  const params = useParams();
  const searchParams = useSearchParams();

  const returnId = String(params?.returnId ?? '');
  const orderNumber = searchParams.get('orderNumber') || '';
  const email = searchParams.get('email') || '';

  const [timeline, setTimeline] = useState<ReturnTimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const loadTimeline = useCallback(async () => {
    if (!returnId) return;
    setLoading(true);
    try {
      const data = await getPublicReturnTimeline(returnId, {
        orderNumber: orderNumber || undefined,
        email: email || undefined,
      });
      setTimeline(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Could not load return tracking timeline. Please check your link or order details.',
      );
    } finally {
      setLoading(false);
    }
  }, [returnId, orderNumber, email]);

  useEffect(() => {
    void loadTimeline();
  }, [loadTimeline]);

  async function handleCancelReturn() {
    setCancelling(true);
    setCancelError(null);
    try {
      const updated = await cancelPublicReturn(returnId, {
        orderNumber: orderNumber || undefined,
        email: email || undefined,
      });
      setTimeline(updated);
      setShowCancelConfirm(false);
    } catch (err) {
      setCancelError(
        err instanceof ApiClientError ? err.message : 'Failed to cancel return request.',
      );
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-12 text-center text-sm text-muted-foreground">
        Loading return tracking timeline…
      </div>
    );
  }

  if (error || !timeline) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-8">
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-5 space-y-2">
          <h2 className="font-semibold text-destructive">Could Not Find Return Request</h2>
          <p className="text-sm text-destructive">{error ?? 'Return record not found.'}</p>
        </div>
        <Link href="/returns" className="sf-button-primary inline-block text-sm">
          ← Return to Self-Service Portal
        </Link>
      </div>
    );
  }

  const badge = getStatusBadge(timeline.status);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
      {/* Breadcrumb navigation */}
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        <Link href="/returns" className="hover:underline">
          Returns Portal
        </Link>
        <span className="mx-2">/</span>
        <span className="font-mono text-foreground">Return #{timeline.id.slice(0, 8)}</span>
      </nav>

      {/* Header Card */}
      <header className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Return Request
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.bg}`}>
                {badge.label}
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold font-mono tracking-tight">{timeline.id}</h1>
          </div>

          <div className="text-right">
            <span className="text-xs text-muted-foreground">Associated Order</span>
            <p className="text-base font-bold font-mono">{timeline.orderNumber}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Requested {formatTimestamp(timeline.requestedAt)}
            </p>
          </div>
        </div>

        {/* Status Description Banner */}
        <div className="rounded-lg border border-border/80 bg-muted/30 p-3 text-xs sm:text-sm">
          <p className="font-medium text-foreground">{timeline.statusDescription}</p>
          {timeline.rejectionNote && (
            <p className="mt-1 text-xs text-destructive font-medium">
              Reason: {timeline.rejectionNote}
            </p>
          )}
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs">
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void loadTimeline()}>
              Refresh Status
            </Button>
            <Link
              href={`/returns?order=${encodeURIComponent(timeline.orderNumber)}&email=${encodeURIComponent(
                email,
              )}`}
              className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 font-medium hover:bg-muted"
            >
              Order Details
            </Link>
          </div>

          {timeline.canCancel && !showCancelConfirm && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setShowCancelConfirm(true)}
            >
              Cancel Return Request
            </Button>
          )}
        </div>

        {/* Cancel Confirmation Dialog */}
        {showCancelConfirm && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
            <p className="text-xs font-semibold text-destructive">
              Are you sure you want to cancel this return request?
            </p>
            <p className="text-xs text-muted-foreground">
              Cancelling will release the return request and stop warehouse intake. You may submit a
              new return request later if your order remains within the return window.
            </p>
            {cancelError && <p className="text-xs text-destructive">{cancelError}</p>}
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={cancelling}
                onClick={() => setShowCancelConfirm(false)}
              >
                Keep Return
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={cancelling}
                onClick={() => void handleCancelReturn()}
              >
                {cancelling ? 'Cancelling…' : 'Yes, Cancel Return'}
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Milestone Timeline Card */}
      <section aria-labelledby="milestones-heading" className="sf-panel space-y-6">
        <div>
          <h2 id="milestones-heading" className="text-lg font-semibold">
            Return Tracking Milestones
          </h2>
          <p className="text-xs text-muted-foreground">
            Follow each stage from customer submission to warehouse quality verification and refund.
          </p>
        </div>

        <ol className="relative ml-4 space-y-8 border-l border-border pl-6">
          {timeline.milestones.map((m) => (
            <li key={m.key} className="relative">
              <span className="absolute -left-[37px] top-0 flex items-center justify-center">
                {getMilestoneStateIcon(m.state)}
              </span>

              <div className="space-y-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold">{m.label}</h3>
                  {m.timestamp && (
                    <time className="text-xs text-muted-foreground">
                      {formatTimestamp(m.timestamp)}
                    </time>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{m.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Items in this return */}
      <section aria-labelledby="items-heading" className="sf-panel space-y-4">
        <h2 id="items-heading" className="text-lg font-semibold">
          Items in this Return ({timeline.items.length})
        </h2>

        <div className="divide-y divide-border rounded-lg border border-border">
          {timeline.items.map((item) => (
            <div key={item.orderItemId} className="flex items-center justify-between p-4 text-xs">
              <div className="space-y-1">
                <p className="font-medium text-sm">{item.productName}</p>
                <div className="flex flex-wrap gap-x-3 text-muted-foreground">
                  <span>Quantity: {item.quantity}</span>
                  <span>Reason: {item.reasonLabel}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold tabular-nums text-sm">
                  {formatMoney(item.lineTotalMinor, 'BDT')}
                </p>
                <span className="text-[10px] text-muted-foreground">
                  {formatMoney(item.unitPriceMinor, 'BDT')} each
                </span>
              </div>
            </div>
          ))}
        </div>

        {timeline.customerNote && (
          <div className="rounded-md border border-border/60 bg-muted/20 p-3 text-xs">
            <span className="font-medium text-muted-foreground">Customer Notes:</span>
            <p className="mt-1 text-foreground">{timeline.customerNote}</p>
          </div>
        )}
      </section>

      {/* Warehouse Inspection details if present */}
      {timeline.inspection && (
        <section aria-labelledby="inspection-heading" className="sf-panel space-y-4">
          <h2 id="inspection-heading" className="text-lg font-semibold">
            Quality Inspection Report
          </h2>

          <div className="grid gap-3 rounded-lg border border-border bg-muted/20 p-4 text-xs sm:grid-cols-3">
            <div>
              <span className="font-medium text-muted-foreground">Inspected Condition</span>
              <p className="mt-0.5 text-sm font-semibold capitalize">
                {timeline.inspection.condition}
              </p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Items Accepted</span>
              <p className="mt-0.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {timeline.inspection.quantityAccepted} of {timeline.inspection.quantityReceived}
              </p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Inspected On</span>
              <p className="mt-0.5 text-sm font-medium">
                {formatTimestamp(timeline.inspection.inspectedAt)}
              </p>
            </div>
          </div>

          {timeline.inspection.note && (
            <div className="rounded-md border border-border/60 bg-background p-3 text-xs">
              <span className="font-medium text-muted-foreground">Inspector Note:</span>
              <p className="mt-1 text-foreground">{timeline.inspection.note}</p>
            </div>
          )}
        </section>
      )}

      {/* Footer navigation */}
      <div className="flex justify-between items-center pt-4 border-t border-border text-xs">
        <Link href="/returns" className="text-primary hover:underline font-medium">
          ← Back to Returns Lookup
        </Link>
        <Link href="/" className="text-muted-foreground hover:underline">
          Return to Storefront Home
        </Link>
      </div>
    </div>
  );
}

export default function ReturnTimelinePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl p-12 text-center text-sm text-muted-foreground">
          Loading return tracking timeline…
        </div>
      }
    >
      <ReturnTimelineDetail />
    </Suspense>
  );
}
