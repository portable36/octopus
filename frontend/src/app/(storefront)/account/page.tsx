'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import { fetchMe, type MeResponse } from '@/lib/auth-api';
import {
  fetchProfile,
  listAddresses,
  listMyOrders,
  updateProfile,
  type CustomerAddress,
  type CustomerProfile,
  type OrderSummary,
} from '@/lib/account-api';
import { formatMoney } from '@/lib/storefront-api';

export default function AccountProfilePage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [meResult, profileResult, ordersResult, addressesResult] = await Promise.allSettled([
        fetchMe(),
        fetchProfile(),
        listMyOrders(),
        listAddresses(),
      ]);
      if (cancelled) {
        return;
      }
      if (meResult.status === 'fulfilled') {
        setMe(meResult.value);
      }
      if (profileResult.status === 'fulfilled') {
        setProfile(profileResult.value);
      } else {
        const reason = profileResult.reason;
        setError(reason instanceof ApiClientError ? reason.message : 'Failed to load profile.');
      }
      if (ordersResult.status === 'fulfilled') {
        setOrders(ordersResult.value);
      }
      if (addressesResult.status === 'fulfilled') {
        setAddresses(addressesResult.value);
      }
      if (
        profileResult.status === 'rejected' ||
        ordersResult.status === 'rejected' ||
        addressesResult.status === 'rejected'
      ) {
        setError((current) => current ?? 'Some account information could not be loaded.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setSaved(false);
    setError(null);
    try {
      const next = await updateProfile({
        displayName: String(form.get('displayName') || '').trim(),
        phone: String(form.get('phone') || '').trim() || null,
      });
      setProfile(next);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Save failed.');
    } finally {
      setPending(false);
    }
  }

  if (!profile && orders === null && addresses === null && !error) {
    return <p className="text-sm text-muted-foreground">Loading profile…</p>;
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="sf-eyebrow">Customer dashboard</p>
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
          Welcome back{profile?.displayName ? `, ${profile.displayName}` : ''}
        </h1>
        {me ? (
          <p className="text-sm text-muted-foreground">
            {me.email} · Keep your orders, addresses, and profile details close at hand.
          </p>
        ) : null}
      </header>

      {error ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
          <button
            type="button"
            className="min-h-11 rounded-md border border-border px-3 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => {
              setError(null);
              setProfile(null);
              setOrders(null);
              setAddresses(null);
              setRetryCount((count) => count + 1);
            }}
          >
            Retry
          </button>
        </div>
      ) : null}
      <section className="grid gap-4 sm:grid-cols-4" aria-label="Account overview">
        <Link href="/account/orders" className="sf-panel block hover:border-foreground">
          <p className="sf-eyebrow">Orders</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{orders?.length ?? '—'}</p>
          <p className="mt-1 text-sm text-muted-foreground">View order history</p>
        </Link>
        <Link href="/account/addresses" className="sf-panel block hover:border-foreground">
          <p className="sf-eyebrow">Addresses</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{addresses?.length ?? '—'}</p>
          <p className="mt-1 text-sm text-muted-foreground">Manage delivery details</p>
        </Link>
        <Link href="/search" className="sf-panel block hover:border-foreground">
          <p className="sf-eyebrow">Next action</p>
          <p className="mt-2 text-lg font-semibold">Find something new</p>
          <p className="mt-1 text-sm text-muted-foreground">Browse live marketplace offers</p>
        </Link>
        <Link href="/vendor/register" className="sf-panel block hover:border-foreground">
          <p className="sf-eyebrow">Sell with us</p>
          <p className="mt-2 text-lg font-semibold">Apply as a vendor</p>
          <p className="mt-1 text-sm text-muted-foreground">Submit your business for review</p>
        </Link>
      </section>

      {orders && orders.length > 0 ? (
        <section className="sf-panel space-y-3" aria-labelledby="recent-orders">
          <div className="sf-section-heading">
            <h2 id="recent-orders">Recent orders</h2>
            <Link
              href="/account/orders"
              className="text-sm font-semibold underline underline-offset-4"
            >
              View all
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {orders.slice(0, 3).map((order) => (
              <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="font-semibold hover:underline"
                  >
                    {order.orderNumber}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {order.status} · {order.fulfillmentStatus}
                  </p>
                </div>
                <p className="sf-price tabular-nums">
                  {formatMoney(order.totalMinor, order.currencyCode)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : orders ? (
        <div className="sf-panel space-y-3">
          <h2 className="text-lg font-semibold">Your orders will appear here</h2>
          <p className="text-sm text-muted-foreground">
            Find an offer and checkout when you are ready.
          </p>
          <Link href="/search" className="sf-button-primary w-fit">
            Browse offers
          </Link>
        </div>
      ) : null}
      {saved ? (
        <p className="text-sm text-muted-foreground" role="status">
          Saved.
        </p>
      ) : null}

      {profile ? (
        <section className="sf-panel mx-auto max-w-lg space-y-6">
          <header className="space-y-1">
            <p className="sf-eyebrow">Account details</p>
            <h2 className="text-2xl font-semibold tracking-tight">Profile</h2>
          </header>
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Display name</span>
              <input
                name="displayName"
                defaultValue={profile.displayName}
                required
                className="h-10 rounded-md border border-border bg-background px-3"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Phone</span>
              <input
                name="phone"
                defaultValue={profile.phone ?? ''}
                className="h-10 rounded-md border border-border bg-background px-3"
              />
            </label>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save'}
            </Button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
