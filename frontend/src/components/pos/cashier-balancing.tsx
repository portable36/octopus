'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiClientError, apiRequest } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import {
  getPendingOfflineReceipts,
  syncOfflineReceiptsToServer,
  type OfflineReceiptQueueItem,
  type SyncOfflineReceiptsResponse,
} from '@/lib/pos-offline-sync';

export interface RegisterBalancingItem {
  readonly registerId: string;
  readonly registerCode: string;
  readonly registerName: string;
  readonly registerStatus: string;
  readonly currentShift?: {
    readonly shiftId: string;
    readonly cashierId: string;
    readonly status: string;
    readonly currency: string;
    readonly openingCashMinor: number;
    readonly cashSalesMinor: number;
    readonly nonCashSalesMinor: number;
    readonly totalSalesMinor: number;
    readonly cashInMinor: number;
    readonly cashRefundsMinor: number;
    readonly cashOutMinor: number;
    readonly expectedCashMinor: number;
    readonly actualCashMinor: number | null;
    readonly differenceMinor: number;
    readonly isShort: boolean;
    readonly openedAt: string;
    readonly closedAt: string | null;
  } | null;
}

export interface StoreBalancingSummary {
  readonly storeId: string;
  readonly totalRegisters: number;
  readonly activeRegisters: number;
  readonly openShiftsCount: number;
  readonly totalOpeningCashMinor: number;
  readonly totalCashSalesMinor: number;
  readonly totalNonCashSalesMinor: number;
  readonly totalSalesMinor: number;
  readonly totalCashInMinor: number;
  readonly totalCashRefundsMinor: number;
  readonly totalCashOutMinor: number;
  readonly totalExpectedCashMinor: number;
  readonly totalActualCashMinor: number;
  readonly totalDifferenceMinor: number;
  readonly currency: string;
  readonly registers: readonly RegisterBalancingItem[];
}

type Props = {
  readonly storeId: string;
  readonly accessToken?: string;
};

export function CashierBalancing({ storeId, accessToken }: Props) {
  const [summary, setSummary] = useState<StoreBalancingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Offline receipts state
  const [offlinePending, setOfflinePending] = useState<OfflineReceiptQueueItem[]>([]);
  const [syncingOffline, setSyncingOffline] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncOfflineReceiptsResponse | null>(null);

  // Modal states
  const [openShiftModalReg, setOpenShiftModalReg] = useState<RegisterBalancingItem | null>(null);
  const [movementModalShift, setMovementModalShift] = useState<{
    shiftId: string;
    regCode: string;
  } | null>(null);
  const [closeShiftModalItem, setCloseShiftModalItem] = useState<{
    shiftId: string;
    regCode: string;
    expectedMinor: number;
    currency: string;
  } | null>(null);

  // Form states
  const [formOpeningCash, setFormOpeningCash] = useState<string>('500');
  const [formMovementKind, setFormMovementKind] = useState<'CASH_IN' | 'CASH_OUT' | 'CASH_REFUND'>(
    'CASH_IN',
  );
  const [formMovementAmount, setFormMovementAmount] = useState<string>('100');
  const [formCountedCash, setFormCountedCash] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const authHeaders = useMemo(() => {
    const headers: HeadersInit = {};
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    return headers;
  }, [accessToken]);

  const loadBalancing = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<StoreBalancingSummary>(
        `/pos/stores/${encodeURIComponent(storeId)}/balancing`,
        { headers: authHeaders },
      );
      setSummary(data);
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : 'Failed to load cashier balancing summary.',
      );
    } finally {
      setLoading(false);
    }
  }, [authHeaders, storeId]);

  const refreshOfflineQueue = useCallback(() => {
    setOfflinePending(getPendingOfflineReceipts(storeId));
  }, [storeId]);

  useEffect(() => {
    void loadBalancing();
    refreshOfflineQueue();
  }, [loadBalancing, refreshOfflineQueue]);

  const handleSyncOffline = async () => {
    setSyncingOffline(true);
    setSyncResult(null);
    try {
      const res = await syncOfflineReceiptsToServer(storeId, accessToken);
      setSyncResult(res);
      refreshOfflineQueue();
      await loadBalancing();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync offline receipts.');
    } finally {
      setSyncingOffline(false);
    }
  };

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openShiftModalReg) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const minor = Math.round(parseFloat(formOpeningCash || '0') * 100);
      await apiRequest(
        `/pos/stores/${encodeURIComponent(storeId)}/registers/${encodeURIComponent(openShiftModalReg.registerId)}/shifts/open`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            openingCashMinor: minor,
            currency: summary?.currency ?? 'BDT',
          }),
        },
      );
      setOpenShiftModalReg(null);
      await loadBalancing();
    } catch (err) {
      setActionError(err instanceof ApiClientError ? err.message : 'Failed to open shift.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementModalShift) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const minor = Math.round(parseFloat(formMovementAmount || '0') * 100);
      await apiRequest(
        `/pos/stores/${encodeURIComponent(storeId)}/shifts/${encodeURIComponent(movementModalShift.shiftId)}/movements`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            kind: formMovementKind,
            amountMinor: minor,
            currency: summary?.currency ?? 'BDT',
          }),
        },
      );
      setMovementModalShift(null);
      await loadBalancing();
    } catch (err) {
      setActionError(
        err instanceof ApiClientError ? err.message : 'Failed to record cash movement.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closeShiftModalItem) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const actualMinor = Math.round(parseFloat(formCountedCash || '0') * 100);
      await apiRequest(
        `/pos/stores/${encodeURIComponent(storeId)}/shifts/${encodeURIComponent(closeShiftModalItem.shiftId)}/close`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            actualCashMinor: actualMinor,
            currency: closeShiftModalItem.currency,
          }),
        },
      );
      setCloseShiftModalItem(null);
      await loadBalancing();
    } catch (err) {
      setActionError(err instanceof ApiClientError ? err.message : 'Failed to close shift.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatMoney = (minor: number, currency = 'BDT') => {
    return `${currency} ${(minor / 100).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="space-y-6">
      {/* Offline Receipts Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-border bg-muted/40 p-3 text-xs">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 font-medium">
            <span
              className={`h-2 w-2 rounded-full ${offlinePending.length > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            />
            Offline Receipt Queue: {offlinePending.length} pending
          </div>
          <p className="text-muted-foreground">
            {offlinePending.length > 0
              ? 'Transactions created while offline are queued in browser localStorage and ready to sync.'
              : 'All offline receipts are synchronized with the server.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {offlinePending.length > 0 && (
            <Button
              type="button"
              size="sm"
              onClick={handleSyncOffline}
              disabled={syncingOffline}
              className="h-8 text-xs"
            >
              {syncingOffline ? 'Syncing…' : 'Sync Offline Receipts Now'}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadBalancing}
            className="h-8 text-xs"
          >
            Refresh
          </Button>
        </div>
      </div>

      {syncResult && (
        <div className="rounded border border-border bg-background p-3 text-xs text-foreground">
          <span className="font-semibold text-emerald-600">Sync Complete:</span> Processed{' '}
          {syncResult.totalProcessed} receipts ({syncResult.syncedCount} newly synced,{' '}
          {syncResult.alreadySyncedCount} existing, {syncResult.rejectedCount} rejected).
        </div>
      )}

      {error && (
        <div className="rounded border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Summary Stat Cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded border border-border bg-card p-3 shadow-sm">
            <p className="text-xs text-muted-foreground">Open Shifts / Registers</p>
            <p className="mt-1 text-xl font-bold">
              {summary.openShiftsCount} / {summary.activeRegisters}
            </p>
          </div>

          <div className="rounded border border-border bg-card p-3 shadow-sm">
            <p className="text-xs text-muted-foreground">Total Cash Sales</p>
            <p className="mt-1 text-xl font-bold text-emerald-600">
              {formatMoney(summary.totalCashSalesMinor, summary.currency)}
            </p>
          </div>

          <div className="rounded border border-border bg-card p-3 shadow-sm">
            <p className="text-xs text-muted-foreground">Expected Cash in Drawers</p>
            <p className="mt-1 text-xl font-bold">
              {formatMoney(summary.totalExpectedCashMinor, summary.currency)}
            </p>
          </div>

          <div className="rounded border border-border bg-card p-3 shadow-sm">
            <p className="text-xs text-muted-foreground">Total Sales (Cash + Card/MFS)</p>
            <p className="mt-1 text-xl font-bold">
              {formatMoney(summary.totalSalesMinor, summary.currency)}
            </p>
          </div>
        </div>
      )}

      {/* Multi-Register Cashier Balancing Table */}
      <div className="overflow-x-auto rounded border border-border bg-background">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border bg-muted/40 font-medium text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5">Register</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Shift</th>
              <th className="px-3 py-2.5 text-right">Opening Cash</th>
              <th className="px-3 py-2.5 text-right">Cash Sales</th>
              <th className="px-3 py-2.5 text-right">Card/MFS</th>
              <th className="px-3 py-2.5 text-right">Drawer Expected</th>
              <th className="px-3 py-2.5 text-right">Over / Short</th>
              <th className="px-3 py-2.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">
                  Loading multi-register cashier balancing…
                </td>
              </tr>
            ) : !summary || summary.registers.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">
                  No registers configured for this store yet.
                </td>
              </tr>
            ) : (
              summary.registers.map((item) => {
                const shift = item.currentShift;
                const isOpen = shift?.status === 'OPEN';
                return (
                  <tr key={item.registerId} className="hover:bg-muted/20">
                    <td className="px-3 py-2.5 font-medium">
                      {item.registerCode}
                      <span className="ml-1.5 text-muted-foreground">({item.registerName})</span>
                    </td>

                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          item.registerStatus === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-neutral-100 text-neutral-800'
                        }`}
                      >
                        {item.registerStatus}
                      </span>
                    </td>

                    <td className="px-3 py-2.5">
                      {isOpen ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Open
                        </span>
                      ) : shift ? (
                        <span className="text-muted-foreground">Closed</span>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </td>

                    <td className="px-3 py-2.5 text-right font-mono">
                      {shift ? formatMoney(shift.openingCashMinor, shift.currency) : '—'}
                    </td>

                    <td className="px-3 py-2.5 text-right font-mono">
                      {shift ? formatMoney(shift.cashSalesMinor, shift.currency) : '—'}
                    </td>

                    <td className="px-3 py-2.5 text-right font-mono">
                      {shift ? formatMoney(shift.nonCashSalesMinor, shift.currency) : '—'}
                    </td>

                    <td className="px-3 py-2.5 text-right font-mono font-medium">
                      {shift ? formatMoney(shift.expectedCashMinor, shift.currency) : '—'}
                    </td>

                    <td className="px-3 py-2.5 text-right font-mono">
                      {shift?.actualCashMinor !== null && shift?.actualCashMinor !== undefined ? (
                        shift.isShort ? (
                          <span className="text-destructive font-semibold">
                            -{formatMoney(shift.differenceMinor, shift.currency)}
                          </span>
                        ) : shift.differenceMinor > 0 ? (
                          <span className="text-blue-600 font-semibold">
                            +{formatMoney(shift.differenceMinor, shift.currency)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-medium">Balanced</span>
                        )
                      ) : (
                        <span className="text-muted-foreground">Active</span>
                      )}
                    </td>

                    <td className="px-3 py-2.5 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        {!isOpen && item.registerStatus === 'ACTIVE' && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setOpenShiftModalReg(item);
                              setActionError(null);
                            }}
                            className="h-7 text-[11px]"
                          >
                            Open Shift
                          </Button>
                        )}

                        {isOpen && shift && (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setMovementModalShift({
                                  shiftId: shift.shiftId,
                                  regCode: item.registerCode,
                                });
                                setActionError(null);
                              }}
                              className="h-7 text-[11px]"
                            >
                              Movement
                            </Button>

                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              onClick={() => {
                                setCloseShiftModalItem({
                                  shiftId: shift.shiftId,
                                  regCode: item.registerCode,
                                  expectedMinor: shift.expectedCashMinor,
                                  currency: shift.currency,
                                });
                                setFormCountedCash((shift.expectedCashMinor / 100).toFixed(2));
                                setActionError(null);
                              }}
                              className="h-7 text-[11px]"
                            >
                              Close Shift
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Open Shift */}
      {openShiftModalReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded border border-border bg-background p-5 shadow-lg">
            <h3 className="text-sm font-semibold">Open Shift · {openShiftModalReg.registerCode}</h3>
            <p className="text-xs text-muted-foreground">
              Enter the starting physical cash count in the cash drawer.
            </p>

            <form onSubmit={handleOpenShift} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium">
                  Opening Cash ({summary?.currency ?? 'BDT'})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formOpeningCash}
                  onChange={(e) => setFormOpeningCash(e.target.value)}
                  className="mt-1 w-full rounded border border-input bg-background px-3 py-1.5 text-xs"
                />
              </div>

              {actionError && <p className="text-xs text-destructive">{actionError}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOpenShiftModalReg(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? 'Opening…' : 'Confirm & Open'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cash Movement */}
      {movementModalShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded border border-border bg-background p-5 shadow-lg">
            <h3 className="text-sm font-semibold">
              Record Cash Movement · {movementModalShift.regCode}
            </h3>
            <p className="text-xs text-muted-foreground">
              Record manual cash additions (float), drops to safe, or customer cash payouts.
            </p>

            <form onSubmit={handleRecordMovement} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium">Movement Type</label>
                <select
                  value={formMovementKind}
                  onChange={(e) =>
                    setFormMovementKind(e.target.value as 'CASH_IN' | 'CASH_OUT' | 'CASH_REFUND')
                  }
                  className="mt-1 w-full rounded border border-input bg-background px-3 py-1.5 text-xs"
                >
                  <option value="CASH_IN">Cash In (Drawer float / deposit)</option>
                  <option value="CASH_OUT">Cash Out (Drop to safe / payout)</option>
                  <option value="CASH_REFUND">Cash Refund</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium">
                  Amount ({summary?.currency ?? 'BDT'})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={formMovementAmount}
                  onChange={(e) => setFormMovementAmount(e.target.value)}
                  className="mt-1 w-full rounded border border-input bg-background px-3 py-1.5 text-xs"
                />
              </div>

              {actionError && <p className="text-xs text-destructive">{actionError}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMovementModalShift(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? 'Recording…' : 'Record'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Close Shift & Cashier Balancing */}
      {closeShiftModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded border border-border bg-background p-5 shadow-lg">
            <h3 className="text-sm font-semibold">
              Reconcile & Close Shift · {closeShiftModalItem.regCode}
            </h3>
            <p className="text-xs text-muted-foreground">
              Count all physical cash in the register drawer and verify balancing variance.
            </p>

            <form onSubmit={handleCloseShift} className="mt-4 space-y-3">
              <div className="rounded border border-border bg-muted/30 p-3 text-xs">
                <div className="flex justify-between">
                  <span>Expected Drawer Cash:</span>
                  <span className="font-mono font-medium">
                    {formatMoney(closeShiftModalItem.expectedMinor, closeShiftModalItem.currency)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium">
                  Counted Cash in Drawer ({closeShiftModalItem.currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formCountedCash}
                  onChange={(e) => setFormCountedCash(e.target.value)}
                  className="mt-1 w-full rounded border border-input bg-background px-3 py-1.5 text-xs font-mono font-semibold"
                />
              </div>

              {/* Live variance indicator */}
              {formCountedCash !== '' && !isNaN(parseFloat(formCountedCash)) && (
                <div className="rounded border border-border p-2 text-xs">
                  {(() => {
                    const countedMinor = Math.round(parseFloat(formCountedCash) * 100);
                    const diffMinor = countedMinor - closeShiftModalItem.expectedMinor;
                    if (diffMinor === 0) {
                      return (
                        <span className="font-semibold text-emerald-600">
                          ✓ Perfect balance: Counted cash matches expected cash.
                        </span>
                      );
                    } else if (diffMinor < 0) {
                      return (
                        <span className="font-semibold text-destructive">
                          ⚠ Shortage of{' '}
                          {formatMoney(Math.abs(diffMinor), closeShiftModalItem.currency)}.
                        </span>
                      );
                    } else {
                      return (
                        <span className="font-semibold text-blue-600">
                          ℹ Overage of {formatMoney(diffMinor, closeShiftModalItem.currency)}.
                        </span>
                      );
                    }
                  })()}
                </div>
              )}

              {actionError && <p className="text-xs text-destructive">{actionError}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCloseShiftModalItem(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? 'Closing…' : 'Confirm & Close Shift'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
