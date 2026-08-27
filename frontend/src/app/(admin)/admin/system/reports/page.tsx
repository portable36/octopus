'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { ApiClientError } from '@/lib/api-client';
import {
  getAdminOrderReportSummary,
  getAdminStoreReportSummary,
  getAdminVendorReportSummary,
  type AdminOrderReportSummary,
  type AdminStorePerformanceRow,
  type AdminVendorPerformanceRow,
} from '@/lib/admin-api';

function money(minor: number): string {
  return (minor / 100).toFixed(2);
}

function shortId(id: string): string {
  return `${id.slice(0, 8)}…`;
}

export default function AdminReportsPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [orders, setOrders] = useState<AdminOrderReportSummary | null>(null);
  const [vendors, setVendors] = useState<AdminVendorPerformanceRow[]>([]);
  const [stores, setStores] = useState<AdminStorePerformanceRow[]>([]);
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
        const [orderSummary, vendorRows, storeRows] = await Promise.all([
          getAdminOrderReportSummary(token),
          getAdminVendorReportSummary(token),
          getAdminStoreReportSummary(token),
        ]);
        if (!cancelled) {
          setOrders(orderSummary);
          setVendors(vendorRows);
          setStores(storeRows);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load reports.');
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
    <div className="space-y-8">
      <AdminPageHeader
        title="Reports"
        description="First-party read models from reporting_order_facts (Phase 21). Not live transactional scans."
      />
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!loading && !error && orders ? (
        <section className="space-y-2">
          <h3 className="text-lg font-medium">Platform orders</h3>
          <p className="text-sm text-muted-foreground">
            {orders.paidOrderCount}/{orders.orderCount} paid
          </p>
          <ul className="space-y-1 text-sm">
            {orders.currencies.map((row) => (
              <li key={row.currencyCode}>
                {row.currencyCode}: revenue {money(row.revenueMinor)} · commission{' '}
                {money(row.commissionMinor)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {!loading && !error ? (
        <section className="space-y-3">
          <h3 className="text-lg font-medium">Vendor performance</h3>
          <div className="overflow-x-auto rounded-lg border border-border bg-background">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Vendor</th>
                  <th className="px-3 py-2 font-medium">Orders</th>
                  <th className="px-3 py-2 font-medium">Paid</th>
                  <th className="px-3 py-2 font-medium">Revenue*</th>
                  <th className="px-3 py-2 font-medium">Commission*</th>
                </tr>
              </thead>
              <tbody>
                {vendors.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-muted-foreground" colSpan={5}>
                      No projected vendor rows yet.
                    </td>
                  </tr>
                ) : (
                  vendors.map((row) => (
                    <tr key={row.vendorId} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-mono text-xs">{shortId(row.vendorId)}</td>
                      <td className="px-3 py-2">{row.orderCount}</td>
                      <td className="px-3 py-2">{row.paidOrderCount}</td>
                      <td className="px-3 py-2">{money(row.revenueMinor)}</td>
                      <td className="px-3 py-2">{money(row.commissionMinor)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            * Sum of paid totals across currencies (display only; prefer currency buckets for mixed
            FX).
          </p>
        </section>
      ) : null}
      {!loading && !error ? (
        <section className="space-y-3">
          <h3 className="text-lg font-medium">Store performance</h3>
          <div className="overflow-x-auto rounded-lg border border-border bg-background">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Store</th>
                  <th className="px-3 py-2 font-medium">Vendor</th>
                  <th className="px-3 py-2 font-medium">Orders</th>
                  <th className="px-3 py-2 font-medium">Paid</th>
                  <th className="px-3 py-2 font-medium">Revenue*</th>
                  <th className="px-3 py-2 font-medium">Commission*</th>
                </tr>
              </thead>
              <tbody>
                {stores.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-muted-foreground" colSpan={6}>
                      No projected store rows yet.
                    </td>
                  </tr>
                ) : (
                  stores.map((row) => (
                    <tr key={row.storeId} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-mono text-xs">{shortId(row.storeId)}</td>
                      <td className="px-3 py-2 font-mono text-xs">{shortId(row.vendorId)}</td>
                      <td className="px-3 py-2">{row.orderCount}</td>
                      <td className="px-3 py-2">{row.paidOrderCount}</td>
                      <td className="px-3 py-2">{money(row.revenueMinor)}</td>
                      <td className="px-3 py-2">{money(row.commissionMinor)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
