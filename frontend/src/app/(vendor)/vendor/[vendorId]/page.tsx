'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ApiClientError } from '@/lib/api-client';
import {
  formatVendorMoney,
  getVendor,
  getVendorFinanceSummary,
  listStoresForVendor,
  type VendorFinanceSummary,
  type VendorSummary,
} from '@/lib/vendor-api';

export default function VendorDashboardPage() {
  const params = useParams<{ vendorId: string }>();
  const vendorId = params.vendorId;
  const [vendor, setVendor] = useState<VendorSummary | null>(null);
  const [summary, setSummary] = useState<VendorFinanceSummary | null>(null);
  const [storeCount, setStoreCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    void (async () => {
      try {
        const [v, finance, stores] = await Promise.all([
          getVendor(vendorId),
          getVendorFinanceSummary(vendorId),
          listStoresForVendor(vendorId),
        ]);
        if (cancelled) {
          return;
        }
        setVendor(v);
        setSummary(finance);
        setStoreCount(stores.length);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load dashboard.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [retryCount, vendorId]);

  if (!vendor && !error) {
    return <p className="text-sm text-muted-foreground">Loading dashboard…</p>;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="sf-eyebrow">Vendor dashboard</p>
        <h2 className="text-xl font-semibold tracking-tight">
          {vendor?.profile.displayName ?? 'Dashboard'}
        </h2>
        {vendor ? (
          <p className="text-sm text-muted-foreground">
            Status <span className="uppercase">{vendor.status}</span> · {vendor.profile.slug}
          </p>
        ) : null}
        <p className="max-w-2xl text-sm text-muted-foreground">
          Manage your stores, published catalog, inventory, orders, and vendor finance from one
          scoped workspace.
        </p>
      </header>

      {error ? (
        <div className="space-y-3">
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
          <button
            type="button"
            className="min-h-11 rounded-md border border-border px-3 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setRetryCount((count) => count + 1)}
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-md border border-border bg-background p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Stores</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{storeCount ?? '—'}</p>
        </div>
        {summary ? (
          <>
            <div className="rounded-md border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Available</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {formatVendorMoney(summary.availableMinor, summary.currencyCode)}
              </p>
            </div>
            <div className="rounded-md border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Pending</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {formatVendorMoney(summary.pendingMinor, summary.currencyCode)}
              </p>
            </div>
            <div className="rounded-md border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Spendable</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {formatVendorMoney(summary.spendableMinor, summary.currencyCode)}
              </p>
            </div>
            <div className="rounded-md border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Reserved payouts
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {formatVendorMoney(summary.reservedPayoutMinor, summary.currencyCode)}
              </p>
            </div>
          </>
        ) : null}
      </div>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Vendor actions">
        <DashboardLink href={`/vendor/${vendorId}/orders`} label="Review orders" />
        <DashboardLink href={`/vendor/${vendorId}/catalog`} label="Manage catalog" />
        <DashboardLink href={`/vendor/${vendorId}/inventory`} label="Check inventory" />
        <DashboardLink href={`/vendor/${vendorId}/finance`} label="View finance" />
      </section>
    </div>
  );
}

function DashboardLink({ href, label }: { readonly href: string; readonly label: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-11 items-center justify-between rounded-md border border-border bg-background px-4 py-3 text-sm font-medium hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {label}
      <span aria-hidden="true">→</span>
    </Link>
  );
}
