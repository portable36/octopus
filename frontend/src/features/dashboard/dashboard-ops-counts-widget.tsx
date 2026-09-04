'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAccessToken } from '@/lib/use-access-token';
import { ApiClientError } from '@/lib/api-client';
import {
  getAdminStoreStats,
  listAdminOrders,
  listAdminPayments,
  listAdminUsers,
  listAdminVendors,
} from '@/lib/admin-api';

type Counts = {
  vendors: number | null;
  stores: number | null;
  ordersRecent: number | null;
  paymentsRecent: number | null;
  usersRecent: number | null;
};

const EMPTY: Counts = {
  vendors: null,
  stores: null,
  ordersRecent: null,
  paymentsRecent: null,
  usersRecent: null,
};

function Stat({
  label,
  value,
  href,
  note,
}: {
  readonly label: string;
  readonly value: number | null;
  readonly href: string;
  readonly note?: string;
}) {
  return (
    <div>
      <dt className="text-muted-foreground">
        <Link href={href} className="underline-offset-2 hover:underline">
          {label}
        </Link>
      </dt>
      <dd className="text-xl font-semibold">{value === null ? '—' : value}</dd>
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}

export function DashboardOpsCountsWidget() {
  const token = useAccessToken();
  const [counts, setCounts] = useState<Counts>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    if (!token) {
      setLoading(false);
      setError('Sign in required to load operational counts.');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [vendors, storeStats, orders, payments, users] = await Promise.all([
          listAdminVendors(token),
          getAdminStoreStats(token),
          listAdminOrders(token, 50),
          listAdminPayments(token, 50),
          listAdminUsers(token, 50),
        ]);
        if (!cancelled) {
          setCounts({
            vendors: vendors.length,
            stores: storeStats.total,
            ordersRecent: orders.length,
            paymentsRecent: payments.length,
            usersRecent: users.length,
          });
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load counts.');
          setCounts(EMPTY);
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
  }, [retryCount, token]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading counts…</p>;
  }
  if (error) {
    return (
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
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Counts from existing admin list APIs. Aggregates and trends stay in Phase 21.
      </p>
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <Stat label="Vendors" value={counts.vendors} href={'/admin/vendors'} />
        <Stat label="Stores" value={counts.stores} href={'/admin/stores'} />
        <Stat label="Orders" value={counts.ordersRecent} href={'/admin/orders'} note="Recent ≤50" />
        <Stat
          label="Payments"
          value={counts.paymentsRecent}
          href={'/admin/payments'}
          note="Recent ≤50"
        />
        <Stat label="Users" value={counts.usersRecent} href={'/admin/users'} note="Recent ≤50" />
      </dl>
    </div>
  );
}
