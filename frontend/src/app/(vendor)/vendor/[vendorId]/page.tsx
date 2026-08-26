'use client';

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

  useEffect(() => {
    let cancelled = false;
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
  }, [vendorId]);

  if (!vendor && !error) {
    return <p className="text-sm text-muted-foreground">Loading dashboard…</p>;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">
          {vendor?.profile.displayName ?? 'Dashboard'}
        </h2>
        {vendor ? (
          <p className="text-sm text-muted-foreground">
            Status <span className="uppercase">{vendor.status}</span> · {vendor.profile.slug}
          </p>
        ) : null}
      </header>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
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
    </div>
  );
}
