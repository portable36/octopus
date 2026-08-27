'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ApiClientError } from '@/lib/api-client';
import {
  listAdminOrders,
  listAdminPayments,
  listAdminStores,
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
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [counts, setCounts] = useState<Counts>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('Pass ?token= to load operational counts.');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [vendors, stores, orders, payments, users] = await Promise.all([
          listAdminVendors(token),
          listAdminStores(token),
          listAdminOrders(token, 50),
          listAdminPayments(token, 50),
          listAdminUsers(token, 50),
        ]);
        if (!cancelled) {
          setCounts({
            vendors: vendors.length,
            stores: stores.length,
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
  }, [token]);

  const withToken = (href: string) => (token ? `${href}?token=${encodeURIComponent(token)}` : href);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading counts…</p>;
  }
  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Counts from existing admin list APIs. Aggregates and trends stay in Phase 21.
      </p>
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <Stat label="Vendors" value={counts.vendors} href={withToken('/admin/vendors')} />
        <Stat label="Stores" value={counts.stores} href={withToken('/admin/stores')} />
        <Stat
          label="Orders"
          value={counts.ordersRecent}
          href={withToken('/admin/orders')}
          note="Recent ≤50"
        />
        <Stat
          label="Payments"
          value={counts.paymentsRecent}
          href={withToken('/admin/payments')}
          note="Recent ≤50"
        />
        <Stat
          label="Users"
          value={counts.usersRecent}
          href={withToken('/admin/users')}
          note="Recent ≤50"
        />
      </dl>
    </div>
  );
}
