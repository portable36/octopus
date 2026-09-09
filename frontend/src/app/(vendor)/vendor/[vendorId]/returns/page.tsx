'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import {
  approveReturn,
  inspectReturn,
  listStoreReturns,
  receiveReturn,
  rejectReturn,
  type VendorReturn,
} from '@/lib/vendor-api';
import { getSelectedStoreId, subscribeSelectedStoreId } from '@/lib/vendor-session';

type StatusFilter =
  | 'ALL'
  | 'REQUESTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'AWAITING_RETURN'
  | 'RECEIVED'
  | 'INSPECTING'
  | 'DONE';

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'REQUESTED', label: 'Requested' },
  { id: 'UNDER_REVIEW', label: 'Under review' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'AWAITING_RETURN', label: 'Awaiting return' },
  { id: 'RECEIVED', label: 'Received' },
  { id: 'INSPECTING', label: 'Inspecting' },
  { id: 'DONE', label: 'Closed' },
];

const DONE_STATUSES = new Set([
  'REJECTED',
  'CANCELLED',
  'INSPECTION_APPROVED',
  'INSPECTION_REJECTED',
]);

const CONDITIONS = [
  'NEW',
  'LIKE_NEW',
  'USED',
  'DAMAGED',
  'DEFECTIVE',
  'UNSELLABLE',
  'UNKNOWN',
] as const;

function matchesFilter(ret: VendorReturn, filter: StatusFilter): boolean {
  if (filter === 'ALL') return true;
  if (filter === 'DONE') return DONE_STATUSES.has(ret.status);
  if (filter === 'APPROVED') return ret.status === 'APPROVED' || ret.status === 'AWAITING_RETURN';
  return ret.status === filter;
}

function formatWhen(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function VendorReturnsPage() {
  const params = useParams<{ vendorId: string }>();
  const vendorId = params.vendorId;

  const [storeId, setStoreId] = useState<string | null>(null);
  const [returns, setReturns] = useState<VendorReturn[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [rejectReason, setRejectReason] = useState('OTHER');
  const [rejectNote, setRejectNote] = useState('');
  const [qtyReceived, setQtyReceived] = useState(1);
  const [qtyAccepted, setQtyAccepted] = useState(1);
  const [qtyRejected, setQtyRejected] = useState(0);
  const [condition, setCondition] = useState<(typeof CONDITIONS)[number]>('UNKNOWN');
  const [inspectNote, setInspectNote] = useState('');

  useEffect(() => {
    const sync = () => setStoreId(getSelectedStoreId());
    sync();
    return subscribeSelectedStoreId(sync);
  }, []);

  const reload = useCallback(async () => {
    if (!storeId || !vendorId) {
      setReturns([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await listStoreReturns(storeId, vendorId);
      setReturns(rows);
      setError(null);
      if (selectedId && !rows.some((r) => r.id === selectedId)) {
        setSelectedId(rows[0]?.id ?? null);
      } else if (!selectedId && rows[0]) {
        setSelectedId(rows[0].id);
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load returns.');
      setReturns([]);
    } finally {
      setLoading(false);
    }
  }, [storeId, vendorId, selectedId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const visible = useMemo(
    () => returns.filter((r) => matchesFilter(r, filter)),
    [returns, filter],
  );

  const selected = useMemo(
    () => returns.find((r) => r.id === selectedId) ?? null,
    [returns, selectedId],
  );

  useEffect(() => {
    if (!selected) return;
    const totalQty = selected.items.reduce((sum, i) => sum + i.quantity, 0);
    setQtyReceived(totalQty);
    setQtyAccepted(totalQty);
    setQtyRejected(0);
  }, [selected]);

  async function run(action: () => Promise<unknown>, success: string) {
    setPending(true);
    setMessage(null);
    setError(null);
    try {
      await action();
      setMessage(success);
      await reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Action failed.');
    } finally {
      setPending(false);
    }
  }

  async function onReject(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    await run(
      () =>
        rejectReturn(selected.id, {
          reasonCode: rejectReason,
          note: rejectNote.trim() || undefined,
        }),
      'Return rejected.',
    );
  }

  async function onInspect(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    if (qtyAccepted + qtyRejected !== qtyReceived) {
      setError('Accepted + rejected must equal received quantity.');
      return;
    }
    await run(
      () =>
        inspectReturn(selected.id, {
          quantityReceived: qtyReceived,
          quantityAccepted: qtyAccepted,
          quantityRejected: qtyRejected,
          condition,
          note: inspectNote.trim() || undefined,
        }),
      'Inspection completed.',
    );
  }

  if (!storeId) {
    return (
      <div className="space-y-2 p-6">
        <h1 className="text-xl font-semibold">Returns</h1>
        <p className="text-sm text-muted-foreground">
          Select a store in the vendor shell to manage return requests.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Returns management</h1>
        <p className="text-sm text-muted-foreground">
          Review, approve, receive, and inspect customer return requests for the selected store.
        </p>
      </header>

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200" role="status">
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-md border px-3 py-1 text-xs font-medium ${
              filter === f.id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background hover:bg-muted'
            }`}
          >
            {f.label}
          </button>
        ))}
        <Button type="button" size="sm" variant="outline" disabled={loading || pending} onClick={() => void reload()}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="rounded-lg border border-border bg-background">
          <div className="border-b border-border px-4 py-3 text-sm font-medium">
            Store returns ({visible.length})
          </div>
          {loading && returns.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Loading…</p>
          ) : visible.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No returns match this filter.</p>
          ) : (
            <ul className="divide-y divide-border">
              {visible.map((ret) => (
                <li key={ret.id}>
                  <button
                    type="button"
                    className={`flex w-full flex-col gap-1 px-4 py-3 text-left text-sm hover:bg-muted/50 ${
                      selectedId === ret.id ? 'bg-muted/60' : ''
                    }`}
                    onClick={() => setSelectedId(ret.id)}
                  >
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs">{ret.id.slice(0, 8)}…</span>
                      <span className="rounded bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase">
                        {ret.status}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Order {ret.orderId.slice(0, 8)}… · {ret.items.length} line(s) ·{' '}
                      {formatWhen(ret.requestedAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-4 rounded-lg border border-border bg-background p-4">
          {!selected ? (
            <p className="text-sm text-muted-foreground">Select a return to manage.</p>
          ) : (
            <>
              <div className="space-y-2 border-b border-border pb-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Return ID</p>
                    <p className="font-mono text-sm font-semibold">{selected.id}</p>
                  </div>
                  <span className="rounded bg-secondary px-2 py-0.5 text-xs font-semibold uppercase">
                    {selected.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Requested {formatWhen(selected.requestedAt)} · Order{' '}
                  <Link
                    href={`/vendor/${vendorId}/orders/${selected.orderId}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {selected.orderId.slice(0, 8)}…
                  </Link>
                </p>
                {selected.customerNote ? (
                  <p className="rounded-md bg-muted/40 p-2 text-xs">
                    <span className="font-medium">Customer note:</span> {selected.customerNote}
                  </p>
                ) : null}
                {selected.rejectionNote ? (
                  <p className="rounded-md border border-destructive/20 bg-destructive/5 p-2 text-xs text-destructive">
                    Rejection: {selected.rejectionNote}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Items</h3>
                <ul className="divide-y divide-border rounded-md border border-border text-xs">
                  {selected.items.map((item) => (
                    <li key={item.orderItemId} className="flex justify-between gap-3 px-3 py-2">
                      <div>
                        <p className="font-medium">{item.productName || item.sku}</p>
                        <p className="text-muted-foreground">
                          Qty {item.quantity} · {item.reasonCode}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-wrap gap-2">
                {(selected.status === 'REQUESTED' || selected.status === 'UNDER_REVIEW') && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        void run(() => approveReturn(selected.id), 'Return approved — awaiting customer shipment.')
                      }
                    >
                      Approve
                    </Button>
                  </>
                )}
                {(selected.status === 'APPROVED' || selected.status === 'AWAITING_RETURN') && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      void run(() => receiveReturn(selected.id), 'Marked received — inspection started.')
                    }
                  >
                    Mark received
                  </Button>
                )}
              </div>

              {(selected.status === 'REQUESTED' || selected.status === 'UNDER_REVIEW') && (
                <form onSubmit={(e) => void onReject(e)} className="space-y-3 rounded-md border border-border p-3">
                  <h3 className="text-sm font-semibold">Reject return</h3>
                  <label className="block text-xs">
                    Reason code
                    <input
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      required
                    />
                  </label>
                  <label className="block text-xs">
                    Note
                    <textarea
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5"
                      rows={2}
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                    />
                  </label>
                  <Button type="submit" size="sm" variant="outline" disabled={pending}>
                    Reject
                  </Button>
                </form>
              )}

              {(selected.status === 'RECEIVED' || selected.status === 'INSPECTING') && (
                <form onSubmit={(e) => void onInspect(e)} className="space-y-3 rounded-md border border-border p-3">
                  <h3 className="text-sm font-semibold">Complete inspection</h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="block text-xs">
                      Received
                      <input
                        type="number"
                        min={0}
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5"
                        value={qtyReceived}
                        onChange={(e) => setQtyReceived(Number(e.target.value) || 0)}
                        required
                      />
                    </label>
                    <label className="block text-xs">
                      Accepted
                      <input
                        type="number"
                        min={0}
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5"
                        value={qtyAccepted}
                        onChange={(e) => setQtyAccepted(Number(e.target.value) || 0)}
                        required
                      />
                    </label>
                    <label className="block text-xs">
                      Rejected
                      <input
                        type="number"
                        min={0}
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5"
                        value={qtyRejected}
                        onChange={(e) => setQtyRejected(Number(e.target.value) || 0)}
                        required
                      />
                    </label>
                  </div>
                  <label className="block text-xs">
                    Condition
                    <select
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5"
                      value={condition}
                      onChange={(e) => setCondition(e.target.value as (typeof CONDITIONS)[number])}
                    >
                      {CONDITIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs">
                    Note
                    <textarea
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5"
                      rows={2}
                      value={inspectNote}
                      onChange={(e) => setInspectNote(e.target.value)}
                    />
                  </label>
                  <Button type="submit" size="sm" disabled={pending}>
                    Submit inspection
                  </Button>
                </form>
              )}

              {selected.inspection ? (
                <div className="rounded-md border border-border bg-muted/20 p-3 text-xs space-y-1">
                  <p className="font-semibold">Last inspection</p>
                  <p>
                    {selected.inspection.quantityAccepted} accepted /{' '}
                    {selected.inspection.quantityRejected} rejected of{' '}
                    {selected.inspection.quantityReceived} · {selected.inspection.condition}
                  </p>
                  <p className="text-muted-foreground">
                    {formatWhen(selected.inspection.inspectedAt)}
                    {selected.inspection.note ? ` · ${selected.inspection.note}` : ''}
                  </p>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
