'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import {
  fetchReturnReasons,
  lookupOrderForReturn,
  submitPublicReturn,
  type PublicOrderReturnLookupResponse,
  type ReturnReasonOption,
  type ReturnTimelineResponse,
} from '@/lib/returns-api';
import { formatMoney } from '@/lib/storefront-api';

function newIdempotencyKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `return-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatDate(isoOrDate: string | Date): string {
  try {
    const d = new Date(isoOrDate);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return String(isoOrDate);
  }
}

function ReturnsPortalContent() {
  const searchParams = useSearchParams();
  const initialOrder = searchParams.get('order')?.trim() || '';
  const initialEmail = searchParams.get('email')?.trim() || '';

  const [orderNumber, setOrderNumber] = useState(initialOrder);
  const [email, setEmail] = useState(initialEmail);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [reasons, setReasons] = useState<ReturnReasonOption[]>([]);
  const [lookup, setLookup] = useState<PublicOrderReturnLookupResponse | null>(null);

  // Selected items state: orderItemId -> { selected: boolean; quantity: number; reasonCode: string }
  const [itemSelections, setItemSelections] = useState<
    Record<string, { selected: boolean; quantity: number; reasonCode: string }>
  >({});
  const [customerNote, setCustomerNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedReturn, setSubmittedReturn] = useState<ReturnTimelineResponse | null>(null);

  // Load selectable return reasons
  useEffect(() => {
    void (async () => {
      try {
        const loadedReasons = await fetchReturnReasons();
        setReasons(loadedReasons);
      } catch {
        // Fallback default reasons if endpoint fails
        setReasons([
          {
            code: 'DEFECTIVE',
            label: 'Defective / Not Working',
            requiresInspection: true,
            customerSelectable: true,
            active: true,
          },
          {
            code: 'DAMAGED',
            label: 'Damaged in Transit',
            requiresInspection: true,
            customerSelectable: true,
            active: true,
          },
          {
            code: 'WRONG_ITEM',
            label: 'Wrong Item Sent',
            requiresInspection: true,
            customerSelectable: true,
            active: true,
          },
          {
            code: 'NOT_AS_DESCRIBED',
            label: 'Not as Described',
            requiresInspection: true,
            customerSelectable: true,
            active: true,
          },
          {
            code: 'SIZE_ISSUE',
            label: 'Size / Fit Issue',
            requiresInspection: false,
            customerSelectable: true,
            active: true,
          },
          {
            code: 'CUSTOMER_CHANGED_MIND',
            label: 'Changed Mind',
            requiresInspection: false,
            customerSelectable: true,
            active: true,
          },
        ]);
      }
    })();
  }, []);

  const handleLookup = useCallback(async (ord: string, eml: string) => {
    if (!ord.trim() || !eml.trim()) {
      setSearchError('Please enter both your order number and email address.');
      return;
    }
    setSearching(true);
    setSearchError(null);
    setSubmitError(null);
    setSubmittedReturn(null);

    try {
      const data = await lookupOrderForReturn({
        orderNumber: ord.trim(),
        email: eml.trim(),
      });
      setLookup(data);

      // Initialize default selections for returnable lines
      const initialMap: Record<
        string,
        { selected: boolean; quantity: number; reasonCode: string }
      > = {};
      data.lines.forEach((line) => {
        initialMap[line.orderItemId] = {
          selected: false,
          quantity: Math.min(1, line.returnableQuantity),
          reasonCode: 'DEFECTIVE',
        };
      });
      setItemSelections(initialMap);
    } catch (err) {
      setLookup(null);
      setSearchError(
        err instanceof ApiClientError
          ? err.message
          : 'Could not find order. Please verify your order number and email address.',
      );
    } finally {
      setSearching(false);
    }
  }, []);

  // Auto-search if parameters are in query string
  useEffect(() => {
    if (initialOrder && initialEmail) {
      void handleLookup(initialOrder, initialEmail);
    }
  }, [initialOrder, initialEmail, handleLookup]);

  function onSearchSubmit(e: FormEvent) {
    e.preventDefault();
    void handleLookup(orderNumber, email);
  }

  function toggleLineSelection(orderItemId: string) {
    setItemSelections((prev) => {
      const curr = prev[orderItemId] ?? {
        selected: false,
        quantity: 1,
        reasonCode: reasons[0]?.code ?? 'DEFECTIVE',
      };
      return {
        ...prev,
        [orderItemId]: {
          ...curr,
          selected: !curr.selected,
        },
      };
    });
  }

  function updateQuantity(orderItemId: string, qty: number, max: number) {
    const safeQty = Math.max(1, Math.min(qty, max));
    setItemSelections((prev) => {
      const curr = prev[orderItemId] ?? {
        selected: true,
        quantity: 1,
        reasonCode: reasons[0]?.code ?? 'DEFECTIVE',
      };
      return {
        ...prev,
        [orderItemId]: {
          ...curr,
          quantity: safeQty,
        },
      };
    });
  }

  function updateReason(orderItemId: string, reasonCode: string) {
    setItemSelections((prev) => {
      const curr = prev[orderItemId] ?? { selected: true, quantity: 1, reasonCode };
      return {
        ...prev,
        [orderItemId]: {
          ...curr,
          reasonCode,
        },
      };
    });
  }

  async function onSubmitReturn(e: FormEvent) {
    e.preventDefault();
    if (!lookup) return;

    const selectedLines = Object.entries(itemSelections)
      .filter(([_, sel]) => sel.selected && sel.quantity > 0)
      .map(([orderItemId, sel]) => ({
        orderItemId,
        quantity: sel.quantity,
        reasonCode: sel.reasonCode,
      }));

    if (selectedLines.length === 0) {
      setSubmitError('Please select at least one item to return.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const result = await submitPublicReturn({
        orderNumber: lookup.orderNumber,
        email: lookup.customerEmail ?? email,
        note: customerNote.trim() || undefined,
        idempotencyKey: newIdempotencyKey(),
        items: selectedLines,
      });

      setSubmittedReturn(result);
    } catch (err) {
      setSubmitError(
        err instanceof ApiClientError
          ? err.message
          : 'Failed to submit return request. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
      {/* Header */}
      <header className="space-y-2 border-b border-border pb-6">
        <p className="sf-eyebrow">Customer Care</p>
        <h1 className="text-3xl font-bold tracking-tight">Returns & Self-Service Portal</h1>
        <p className="text-sm text-muted-foreground">
          Enter your order number and email address to check eligibility, request returns, or track
          return progress.
        </p>
      </header>

      {/* Lookup Card */}
      <section aria-labelledby="lookup-title" className="sf-panel">
        <h2 id="lookup-title" className="text-lg font-semibold">
          Find Your Order
        </h2>
        <form onSubmit={onSearchSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="order-number-input"
              className="block text-xs font-medium text-muted-foreground"
            >
              Order Number
            </label>
            <input
              id="order-number-input"
              type="text"
              placeholder="e.g. ORD-12345"
              value={orderNumber}
              disabled={searching}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm uppercase"
              required
            />
          </div>

          <div>
            <label
              htmlFor="order-email-input"
              className="block text-xs font-medium text-muted-foreground"
            >
              Email Address
            </label>
            <input
              id="order-email-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              disabled={searching}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            />
          </div>

          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <Button type="submit" disabled={searching || !orderNumber.trim() || !email.trim()}>
              {searching ? 'Searching Order…' : 'Check Return Eligibility'}
            </Button>
          </div>
        </form>

        {searchError ? (
          <p
            className="mt-4 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive"
            role="alert"
          >
            {searchError}
          </p>
        ) : null}
      </section>

      {/* Success Submission Card */}
      {submittedReturn && (
        <section
          aria-labelledby="success-title"
          className="rounded-xl border border-emerald-500/30 bg-emerald-50/50 p-6 dark:bg-emerald-950/20 space-y-4"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white font-bold">
              ✓
            </div>
            <div>
              <h2
                id="success-title"
                className="text-lg font-semibold text-emerald-900 dark:text-emerald-100"
              >
                Return Request Submitted!
              </h2>
              <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
                Your return request has been assigned ID{' '}
                <strong className="font-mono">{submittedReturn.id}</strong>. Our team is reviewing
                your request.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href={`/returns/${encodeURIComponent(submittedReturn.id)}?orderNumber=${encodeURIComponent(
                orderNumber,
              )}&email=${encodeURIComponent(email)}`}
              className="sf-button-primary inline-flex items-center gap-2 text-sm"
            >
              Track Return Status & Timeline →
            </Link>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSubmittedReturn(null);
                void handleLookup(orderNumber, email);
              }}
            >
              Return to Order
            </Button>
          </div>
        </section>
      )}

      {/* Order Details & Return Eligibility */}
      {lookup && !submittedReturn && (
        <div className="space-y-6">
          {/* Order Summary banner */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <span className="text-xs text-muted-foreground">Order Number</span>
                <p className="text-lg font-bold font-mono">{lookup.orderNumber}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground">Order Date</span>
                <p className="text-sm font-medium">{formatDate(lookup.orderDate)}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground">Total Paid</span>
                <p className="text-lg font-bold tabular-nums">
                  {formatMoney(lookup.totalMinor, lookup.currencyCode)}
                </p>
              </div>
            </div>

            {/* Eligibility Banner */}
            {lookup.returnEligible ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-500/20 bg-emerald-50/60 p-3 text-xs text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-200">
                <span>
                  ✓ <strong>Return Window Open:</strong> You have{' '}
                  <strong>{lookup.daysRemainingInReturnWindow} days remaining</strong> (out of{' '}
                  {lookup.returnWindowDays}-day return policy) to submit a return request.
                </span>
                <span className="rounded bg-emerald-100 px-2 py-0.5 font-semibold dark:bg-emerald-900">
                  Eligible
                </span>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-500/20 bg-amber-50/60 p-3 text-xs text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
                <p className="font-semibold">⚠️ Order Not Eligible for Return</p>
                <p className="mt-1">{lookup.returnIneligibleReason}</p>
              </div>
            )}
          </div>

          {/* Existing Returns for this order */}
          {lookup.existingReturns.length > 0 && (
            <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-3">
              <h3 className="text-sm font-semibold">Previous Return Requests on this Order</h3>
              <ul className="divide-y divide-border/60">
                {lookup.existingReturns.map((ret) => (
                  <li key={ret.returnId} className="flex items-center justify-between py-2 text-xs">
                    <div>
                      <span className="font-mono font-medium">{ret.returnId.slice(0, 8)}…</span>
                      <span className="ml-2 text-muted-foreground">
                        ({ret.totalQuantity} items • requested {formatDate(ret.requestedAt)})
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded bg-secondary px-2 py-0.5 font-medium uppercase">
                        {ret.status}
                      </span>
                      <Link
                        href={`/returns/${encodeURIComponent(ret.returnId)}?orderNumber=${encodeURIComponent(
                          lookup.orderNumber,
                        )}&email=${encodeURIComponent(email)}`}
                        className="text-primary hover:underline font-medium"
                      >
                        View Timeline →
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Return Request Form for Eligible Orders */}
          {lookup.returnEligible && (
            <form onSubmit={onSubmitReturn} className="sf-panel space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Select Items to Return</h2>
                <p className="text-xs text-muted-foreground">
                  Check each item you wish to return, choose quantity, and select the return reason.
                </p>
              </div>

              <div className="divide-y divide-border rounded-lg border border-border">
                {lookup.lines.map((line) => {
                  const sel = itemSelections[line.orderItemId] ?? {
                    selected: false,
                    quantity: 1,
                    reasonCode: 'DEFECTIVE',
                  };
                  const isReturnable = line.returnableQuantity > 0;

                  return (
                    <div
                      key={line.orderItemId}
                      className={`p-4 transition-colors ${
                        sel.selected ? 'bg-primary/5' : 'hover:bg-muted/10'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          id={`check-${line.orderItemId}`}
                          type="checkbox"
                          disabled={!isReturnable || submitting}
                          checked={sel.selected}
                          onChange={() => toggleLineSelection(line.orderItemId)}
                          className="mt-1 h-4 w-4 rounded border-input"
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <label
                              htmlFor={`check-${line.orderItemId}`}
                              className="font-medium text-sm cursor-pointer"
                            >
                              {line.productName}
                            </label>
                            <span className="text-xs font-semibold tabular-nums">
                              {formatMoney(line.unitPriceMinor, lookup.currencyCode)} each
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span>Fulfilled: {line.fulfilledQuantity}</span>
                            {line.alreadyReturnedQuantity > 0 && (
                              <span>Already Returned: {line.alreadyReturnedQuantity}</span>
                            )}
                            <span
                              className={
                                isReturnable
                                  ? 'font-medium text-emerald-600 dark:text-emerald-400'
                                  : 'text-destructive'
                              }
                            >
                              Available to Return: {line.returnableQuantity}
                            </span>
                          </div>

                          {/* Controls when item is selected */}
                          {sel.selected && isReturnable && (
                            <div className="mt-3 grid gap-3 pt-3 border-t border-border/50 sm:grid-cols-2">
                              <div>
                                <label
                                  htmlFor={`qty-${line.orderItemId}`}
                                  className="block text-xs font-medium text-muted-foreground"
                                >
                                  Return Quantity (max {line.returnableQuantity})
                                </label>
                                <input
                                  id={`qty-${line.orderItemId}`}
                                  type="number"
                                  min={1}
                                  max={line.returnableQuantity}
                                  value={sel.quantity}
                                  disabled={submitting}
                                  onChange={(e) =>
                                    updateQuantity(
                                      line.orderItemId,
                                      parseInt(e.target.value, 10) || 1,
                                      line.returnableQuantity,
                                    )
                                  }
                                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                                />
                              </div>

                              <div>
                                <label
                                  htmlFor={`reason-${line.orderItemId}`}
                                  className="block text-xs font-medium text-muted-foreground"
                                >
                                  Reason for Return
                                </label>
                                <select
                                  id={`reason-${line.orderItemId}`}
                                  value={sel.reasonCode}
                                  disabled={submitting}
                                  onChange={(e) => updateReason(line.orderItemId, e.target.value)}
                                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                                >
                                  {reasons.map((r) => (
                                    <option key={r.code} value={r.code}>
                                      {r.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Customer Notes */}
              <div>
                <label
                  htmlFor="customer-note-input"
                  className="block text-xs font-medium text-muted-foreground"
                >
                  Additional Notes (Optional)
                </label>
                <textarea
                  id="customer-note-input"
                  rows={3}
                  placeholder="Provide any additional details or context about the returned items…"
                  value={customerNote}
                  disabled={submitting}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background p-3 text-sm"
                />
              </div>

              {submitError ? (
                <p
                  className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive"
                  role="alert"
                >
                  {submitError}
                </p>
              ) : null}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Submitting Return…' : 'Submit Return Request'}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReturnsPortalPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm">Loading returns portal…</div>}>
      <ReturnsPortalContent />
    </Suspense>
  );
}
