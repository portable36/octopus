'use client';

import { useEffect, useState } from 'react';
import { useAccessToken } from '@/lib/use-access-token';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { ApiClientError } from '@/lib/api-client';
import {
  getAdminPaymentGateways,
  listAdminPayments,
  type AdminPaymentGatewayStatus,
  type AdminPaymentRow,
} from '@/lib/admin-api';

function money(minor: number, currency: string): string {
  return `${(minor / 100).toFixed(2)} ${currency}`;
}

export default function AdminPaymentsPage() {
  const token = useAccessToken();
  const [rows, setRows] = useState<AdminPaymentRow[]>([]);
  const [gateways, setGateways] = useState<AdminPaymentGatewayStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('Authentication token required.');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [data, gatewayStatus] = await Promise.all([
          listAdminPayments(token),
          getAdminPaymentGateways(token),
        ]);
        if (!cancelled) {
          setRows(data);
          setGateways(gatewayStatus);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load payments.');
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
  }, [token]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Payments"
        description="Gateway readiness and recent payment intents (no client secrets)."
      />
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {gateways ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium">Gateway credentials</h2>
          <p className="text-xs text-muted-foreground">
            Mode: <span className="font-mono">{gateways.mode}</span> — configured flags only (env
            secrets never returned).
          </p>
          <div className="overflow-x-auto rounded-lg border border-border bg-background">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Gateway</th>
                  <th className="px-3 py-2 font-medium">Configured</th>
                  <th className="px-3 py-2 font-medium">Sandbox</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ['SSLCommerz', gateways.sslcommerz],
                    ['bKash', gateways.bkash],
                    ['Nagad', gateways.nagad],
                  ] as const
                ).map(([name, status]) => (
                  <tr key={name} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{name}</td>
                    <td className="px-3 py-2">{status.configured ? 'Yes' : 'No'}</td>
                    <td className="px-3 py-2">{status.sandbox ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
      {!loading && !error ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-background">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Method</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Amount</th>
                <th className="px-3 py-2 font-medium">Order</th>
                <th className="px-3 py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-muted-foreground" colSpan={5}>
                    No payment intents yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">
                      {row.paymentMethod} / {row.provider}
                    </td>
                    <td className="px-3 py-2">{row.status}</td>
                    <td className="px-3 py-2">{money(row.amountMinor, row.currencyCode)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.orderId.slice(0, 8)}…</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
