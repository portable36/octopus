'use client';

import { useEffect, useState } from 'react';
import { useAccessToken } from '@/lib/use-access-token';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { ProductPerformanceWidget } from '@/features/dashboard/product-performance-widget';
import { RefundAnalyticsWidget } from '@/features/dashboard/refund-analytics-widget';
import { ApiClientError } from '@/lib/api-client';
import {
  getAdminCustomerReportSummary,
  getAdminInventoryReportSummary,
  getAdminOrderReportSummary,
  getAdminPayoutReportSummary,
  getAdminStoreReportSummary,
  getAdminVendorReportSummary,
  type AdminCustomerReportSummary,
  type AdminInventoryReportSummary,
  type AdminOrderReportSummary,
  type AdminPayoutReportSummary,
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
  const token = useAccessToken();
  const [orders, setOrders] = useState<AdminOrderReportSummary | null>(null);
  const [vendors, setVendors] = useState<AdminVendorPerformanceRow[]>([]);
  const [stores, setStores] = useState<AdminStorePerformanceRow[]>([]);
  const [customers, setCustomers] = useState<AdminCustomerReportSummary | null>(null);
  const [inventory, setInventory] = useState<AdminInventoryReportSummary | null>(null);
  const [payouts, setPayouts] = useState<AdminPayoutReportSummary | null>(null);
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
        const [
          orderSummary,
          vendorRows,
          storeRows,
          customerSummary,
          inventorySummary,
          payoutSummary,
        ] = await Promise.all([
          getAdminOrderReportSummary(token),
          getAdminVendorReportSummary(token),
          getAdminStoreReportSummary(token),
          getAdminCustomerReportSummary(token, 30, 20),
          getAdminInventoryReportSummary(token),
          getAdminPayoutReportSummary(token, 30),
        ]);
        if (!cancelled) {
          setOrders(orderSummary);
          setVendors(vendorRows);
          setStores(storeRows);
          setCustomers(customerSummary);
          setInventory(inventorySummary);
          setPayouts(payoutSummary);
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
        description="First-party read models (Phase 21). Order/customer from reporting facts; inventory and payout via module report ports."
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
      {!loading && !error && customers ? (
        <section className="space-y-3">
          <h3 className="text-lg font-medium">Customers (30d)</h3>
          <p className="text-sm text-muted-foreground">
            {customers.uniqueCustomerCount} buyers · {customers.guestOrderCount} guest orders ·{' '}
            {customers.orderCount} total orders
          </p>
          <div className="overflow-x-auto rounded-lg border border-border bg-background">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="px-3 py-2 font-medium">Orders</th>
                  <th className="px-3 py-2 font-medium">Paid</th>
                  <th className="px-3 py-2 font-medium">Paid revenue</th>
                </tr>
              </thead>
              <tbody>
                {customers.topCustomers.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-muted-foreground" colSpan={4}>
                      No authenticated buyers in window.
                    </td>
                  </tr>
                ) : (
                  customers.topCustomers.map((row) => (
                    <tr key={row.customerId} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-mono text-xs">{shortId(row.customerId)}</td>
                      <td className="px-3 py-2">{row.orderCount}</td>
                      <td className="px-3 py-2">{row.paidOrderCount}</td>
                      <td className="px-3 py-2">
                        {row.currencyCode} {money(row.revenueMinor)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
      {!loading && !error && inventory ? (
        <section className="space-y-3">
          <h3 className="text-lg font-medium">Inventory health</h3>
          <p className="text-sm text-muted-foreground">
            {inventory.itemCount} active items across {inventory.storeCount} stores ·{' '}
            {inventory.outOfStockCount} out · {inventory.lowStockCount} low ·{' '}
            {inventory.inStockCount} healthy
          </p>
          <div className="overflow-x-auto rounded-lg border border-border bg-background">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Store</th>
                  <th className="px-3 py-2 font-medium">Variant</th>
                  <th className="px-3 py-2 font-medium">Available</th>
                  <th className="px-3 py-2 font-medium">Threshold</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {inventory.alerts.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-muted-foreground" colSpan={5}>
                      No low or out-of-stock alerts.
                    </td>
                  </tr>
                ) : (
                  inventory.alerts.map((row) => (
                    <tr
                      key={`${row.storeId}-${row.variantId}`}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-3 py-2 font-mono text-xs">{shortId(row.storeId)}</td>
                      <td className="px-3 py-2 font-mono text-xs">{shortId(row.variantId)}</td>
                      <td className="px-3 py-2 tabular-nums">{row.available}</td>
                      <td className="px-3 py-2 tabular-nums">{row.lowStockThreshold}</td>
                      <td className="px-3 py-2">{row.stockStatus}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
      {!loading && !error && payouts ? (
        <section className="space-y-3">
          <h3 className="text-lg font-medium">Payouts ({payouts.days}d)</h3>
          <p className="text-sm text-muted-foreground">{payouts.payoutCount} requests in window</p>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="overflow-x-auto rounded-lg border border-border bg-background">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-border text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Count</th>
                    <th className="px-3 py-2 font-medium">Amount*</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.byStatus.length === 0 ? (
                    <tr>
                      <td className="px-3 py-4 text-muted-foreground" colSpan={3}>
                        No payouts in window.
                      </td>
                    </tr>
                  ) : (
                    payouts.byStatus.map((row) => (
                      <tr key={row.status} className="border-b border-border last:border-0">
                        <td className="px-3 py-2">{row.status}</td>
                        <td className="px-3 py-2">{row.count}</td>
                        <td className="px-3 py-2">{money(row.amountMinor)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border bg-background">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-border text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Currency</th>
                    <th className="px-3 py-2 font-medium">Count</th>
                    <th className="px-3 py-2 font-medium">Completed</th>
                    <th className="px-3 py-2 font-medium">Reserved</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.byCurrency.length === 0 ? (
                    <tr>
                      <td className="px-3 py-4 text-muted-foreground" colSpan={4}>
                        No currency buckets.
                      </td>
                    </tr>
                  ) : (
                    payouts.byCurrency.map((row) => (
                      <tr key={row.currencyCode} className="border-b border-border last:border-0">
                        <td className="px-3 py-2">{row.currencyCode}</td>
                        <td className="px-3 py-2">{row.count}</td>
                        <td className="px-3 py-2">{money(row.completedMinor)}</td>
                        <td className="px-3 py-2">{money(row.reservedMinor)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            * Status amounts may mix currencies; prefer per-currency completed/reserved.
          </p>
        </section>
      ) : null}
      {!loading && !error && token ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <ProductPerformanceWidget token={token} title="Platform Top Products" />
          <RefundAnalyticsWidget token={token} title="Platform Refund Analytics" />
        </div>
      ) : null}
    </div>
  );
}
