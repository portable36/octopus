'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import {
  formatVendorMoney,
  getVendorFinanceSummary,
  getVendorStatement,
  listVendorLedger,
  listVendorPayouts,
  requestVendorPayout,
  type VendorFinanceSummary,
  type VendorLedgerEntry,
  type VendorPayout,
  type VendorStatement,
} from '@/lib/vendor-api';
import { getSelectedStoreId, subscribeSelectedStoreId } from '@/lib/vendor-session';

const STATEMENT_LIMIT = 20;
const fieldClass = 'h-10 rounded-md border border-border bg-background px-3';
const labelClass = 'flex flex-col gap-1 text-sm';

function commissionEntries(totalsByType: Readonly<Record<string, number>>): [string, number][] {
  return Object.entries(totalsByType).filter(([key]) => key.includes('COMMISSION'));
}

export default function VendorFinancePage() {
  const params = useParams<{ vendorId: string }>();
  const vendorId = params.vendorId;
  const [storeId, setStoreId] = useState<string | null>(null);
  const [summary, setSummary] = useState<VendorFinanceSummary | null>(null);
  const [payouts, setPayouts] = useState<VendorPayout[]>([]);
  const [ledger, setLedger] = useState<VendorLedgerEntry[]>([]);
  const [statement, setStatement] = useState<VendorStatement | null>(null);
  const [statementFrom, setStatementFrom] = useState('');
  const [statementTo, setStatementTo] = useState('');
  const [statementOffset, setStatementOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [payoutMessage, setPayoutMessage] = useState<string | null>(null);
  const [statementError, setStatementError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [payoutPending, setPayoutPending] = useState(false);
  const [statementPending, setStatementPending] = useState(false);

  useEffect(() => {
    const sync = () => setStoreId(getSelectedStoreId());
    sync();
    return subscribeSelectedStoreId(sync);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [finance, payoutRows, ledgerRows] = await Promise.all([
          getVendorFinanceSummary(vendorId),
          listVendorPayouts(vendorId),
          listVendorLedger(vendorId, 20),
        ]);
        if (cancelled) {
          return;
        }
        setSummary(finance);
        setPayouts(payoutRows);
        setLedger(ledgerRows);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load finance.');
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
  }, [vendorId]);

  async function reloadPayoutsAndSummary() {
    const [finance, payoutRows] = await Promise.all([
      getVendorFinanceSummary(vendorId),
      listVendorPayouts(vendorId),
    ]);
    setSummary(finance);
    setPayouts(payoutRows);
  }

  async function onRequestPayout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!storeId) {
      setError('Select a store in the header before requesting a payout.');
      return;
    }
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const majorRaw = String(form.get('amountMajor') || '').trim();
    const major = Number.parseFloat(majorRaw);
    if (!Number.isFinite(major) || major <= 0) {
      setError('Enter a positive payout amount.');
      return;
    }
    const amountMinor = Math.round(major * 100);
    const currencyCode =
      String(form.get('currencyCode') || '').trim() || summary?.currencyCode || undefined;

    setPayoutPending(true);
    setError(null);
    setPayoutMessage(null);
    try {
      await requestVendorPayout(vendorId, {
        storeId,
        amountMinor,
        ...(currencyCode ? { currencyCode } : {}),
      });
      await reloadPayoutsAndSummary();
      setPayoutMessage('Payout requested.');
      formEl.reset();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Payout request failed.');
    } finally {
      setPayoutPending(false);
    }
  }

  async function loadStatement(offset: number) {
    setStatementPending(true);
    setStatementError(null);
    try {
      const result = await getVendorStatement(vendorId, {
        limit: STATEMENT_LIMIT,
        offset,
        ...(statementFrom ? { from: statementFrom } : {}),
        ...(statementTo ? { to: statementTo } : {}),
      });
      setStatement(result);
      setStatementOffset(offset);
    } catch (err) {
      setStatementError(err instanceof ApiClientError ? err.message : 'Failed to load statement.');
    } finally {
      setStatementPending(false);
    }
  }

  if (loading && !error) {
    return <p className="text-sm text-muted-foreground">Loading finance…</p>;
  }

  const commissionRows = summary ? commissionEntries(summary.totalsByType) : [];

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-xl font-semibold tracking-tight">Finance</h2>
        <p className="text-sm text-muted-foreground">
          Summary, payout request, commission, statements, and recent ledger.
        </p>
      </header>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {payoutMessage ? <p className="text-sm text-muted-foreground">{payoutMessage}</p> : null}

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ['Available', summary.availableMinor],
              ['Pending', summary.pendingMinor],
              ['Spendable', summary.spendableMinor],
              ['Reserved', summary.reservedPayoutMinor],
            ] as const
          ).map(([label, minor]) => (
            <div key={label} className="rounded-md border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="mt-2 text-lg font-semibold tabular-nums">
                {formatVendorMoney(minor, summary.currencyCode)}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Request payout</h3>
        {!storeId ? (
          <p className="text-sm text-muted-foreground">
            Select a store in the header to request a payout.
          </p>
        ) : (
          <form
            className="max-w-lg space-y-3 rounded-md border border-border bg-background p-4"
            onSubmit={onRequestPayout}
          >
            <p className="text-xs text-muted-foreground">
              Store: <span className="font-mono">{storeId}</span>
              {summary ? (
                <>
                  {' '}
                  · Max spendable: {formatVendorMoney(summary.spendableMinor, summary.currencyCode)}
                </>
              ) : null}
            </p>
            <label className={labelClass}>
              Amount (major units, e.g. 10.50)
              <input
                className={fieldClass}
                name="amountMajor"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                required
              />
            </label>
            <label className={labelClass}>
              Currency
              <input
                className={fieldClass}
                name="currencyCode"
                type="text"
                maxLength={3}
                defaultValue={summary?.currencyCode ?? ''}
                placeholder="BDT"
              />
            </label>
            <Button type="submit" disabled={payoutPending}>
              {payoutPending ? 'Requesting…' : 'Request payout'}
            </Button>
          </form>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Payouts</h3>
        <div className="overflow-x-auto rounded-md border border-border bg-background">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Id</th>
                <th className="px-3 py-2 font-medium">Amount</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Requested</th>
              </tr>
            </thead>
            <tbody>
              {payouts.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-muted-foreground" colSpan={4}>
                    No payouts yet.
                  </td>
                </tr>
              ) : (
                payouts.map((payout) => (
                  <tr key={payout.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">{payout.id.slice(0, 8)}…</td>
                    <td className="px-3 py-2 tabular-nums">
                      {formatVendorMoney(payout.amountMinor, payout.currencyCode)}
                    </td>
                    <td className="px-3 py-2">{payout.status}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(payout.requestedAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Commission</h3>
        {commissionRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No commission totals yet.</p>
        ) : (
          <dl className="max-w-md space-y-2 rounded-md border border-border bg-background p-4 text-sm">
            {commissionRows.map(([key, amount]) => (
              <div key={key} className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{key}</dt>
                <dd className="tabular-nums font-medium">
                  {summary ? formatVendorMoney(amount, summary.currencyCode) : amount}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Statement</h3>
        <div className="flex flex-wrap items-end gap-3">
          <label className={labelClass}>
            From
            <input
              className={fieldClass}
              type="date"
              value={statementFrom}
              onChange={(e) => setStatementFrom(e.target.value)}
            />
          </label>
          <label className={labelClass}>
            To
            <input
              className={fieldClass}
              type="date"
              value={statementTo}
              onChange={(e) => setStatementTo(e.target.value)}
            />
          </label>
          <Button type="button" disabled={statementPending} onClick={() => void loadStatement(0)}>
            {statementPending ? 'Loading…' : 'Load statement'}
          </Button>
        </div>
        {statementError ? (
          <p className="text-sm text-destructive" role="alert">
            {statementError}
          </p>
        ) : null}
        {statement ? (
          <>
            <p className="text-xs text-muted-foreground">
              Showing {statement.items.length} of {statement.total} (offset {statement.offset})
            </p>
            <div className="overflow-x-auto rounded-md border border-border bg-background">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-border text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Direction</th>
                    <th className="px-3 py-2 font-medium">Amount</th>
                    <th className="px-3 py-2 font-medium">Occurred</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.items.length === 0 ? (
                    <tr>
                      <td className="px-3 py-4 text-muted-foreground" colSpan={4}>
                        No statement rows for this range.
                      </td>
                    </tr>
                  ) : (
                    statement.items.map((entry) => (
                      <tr key={entry.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2">{entry.entryType}</td>
                        <td className="px-3 py-2">{entry.direction}</td>
                        <td className="px-3 py-2 tabular-nums">
                          {formatVendorMoney(entry.amountMinor, entry.currencyCode)}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {new Date(entry.occurredAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={statementPending || statementOffset <= 0}
                onClick={() => void loadStatement(Math.max(0, statementOffset - STATEMENT_LIMIT))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={statementPending || statementOffset + STATEMENT_LIMIT >= statement.total}
                onClick={() => void loadStatement(statementOffset + STATEMENT_LIMIT)}
              >
                Next
              </Button>
            </div>
          </>
        ) : null}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Recent ledger</h3>
        <div className="overflow-x-auto rounded-md border border-border bg-background">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Direction</th>
                <th className="px-3 py-2 font-medium">Amount</th>
                <th className="px-3 py-2 font-medium">Occurred</th>
              </tr>
            </thead>
            <tbody>
              {ledger.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-muted-foreground" colSpan={4}>
                    No ledger entries.
                  </td>
                </tr>
              ) : (
                ledger.map((entry) => (
                  <tr key={entry.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{entry.entryType}</td>
                    <td className="px-3 py-2">{entry.direction}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {formatVendorMoney(entry.amountMinor, entry.currencyCode)}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(entry.occurredAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
