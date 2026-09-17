'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { sectionNavActiveClass, sectionNavClass } from '@/components/vendor/catalog/catalog-styles';
import { ApiClientError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import {
  addVendorStoreStaff,
  getVendorStore,
  removeVendorStoreStaff,
  type StoreStaffRole,
  type StoreSummary,
} from '@/lib/vendor-api';
import { setSelectedStoreId } from '@/lib/vendor-session';
import { ProductPerformanceWidget } from '@/features/dashboard/product-performance-widget';
import { RefundAnalyticsWidget } from '@/features/dashboard/refund-analytics-widget';
import { VendorSalesTrendsWidget } from '@/features/dashboard/vendor-sales-trends-widget';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'catalog', label: 'Products', storePath: '/catalog' },
  { id: 'inventory', label: 'Inventory', hrefSuffix: '/inventory' },
  { id: 'orders', label: 'Orders', hrefSuffix: '/orders' },
  { id: 'finance', label: 'Finance', hrefSuffix: '/finance' },
  { id: 'staff', label: 'Staff' },
  { id: 'settings', label: 'Settings' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function VendorStoreDetailPage() {
  const params = useParams<{ vendorId: string; storeId: string }>();
  const { vendorId, storeId } = params;
  const [store, setStore] = useState<StoreSummary | null>(null);
  const [tab, setTab] = useState<TabId>('overview');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [staffUserId, setStaffUserId] = useState('');
  const [staffRole, setStaffRole] = useState<StoreStaffRole>('STORE_STAFF');

  useEffect(() => {
    void (async () => {
      try {
        const row = await getVendorStore(storeId);
        setStore(row);
        setSelectedStoreId(storeId);
        setError(null);
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : 'Failed to load store.');
      }
    })();
  }, [storeId]);

  async function runStaffAction(action: () => Promise<StoreSummary>, ok: string) {
    if (pending) {
      return;
    }
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await action();
      setStore(updated);
      setMessage(ok);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Staff action failed.');
    } finally {
      setPending(false);
    }
  }

  async function onAddStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const userId = staffUserId.trim();
    if (!userId) {
      return;
    }
    await runStaffAction(
      () => addVendorStoreStaff(storeId, userId, staffRole),
      'Staff member assigned.',
    );
    setStaffUserId('');
  }

  if (error && !store) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (!store) {
    return <p className="text-sm text-muted-foreground">Loading store…</p>;
  }

  const staff = store.staff ?? [];

  return (
    <div className="space-y-6">
      <header>
        <Link
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          href={`/vendor/${vendorId}/stores`}
        >
          ← Stores
        </Link>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">{store.profile.displayName}</h2>
        <p className="font-mono text-sm text-muted-foreground">
          {store.storeCode ?? store.profile.slug} · {store.status}
        </p>
      </header>

      <nav className="flex flex-wrap gap-2" aria-label="Store sections">
        {TABS.map((item) => {
          if ('storePath' in item && item.storePath) {
            return (
              <Link
                key={item.id}
                href={`/vendor/${vendorId}/stores/${storeId}${item.storePath}`}
                className={cn(sectionNavClass, 'inline-flex items-center')}
              >
                {item.label}
              </Link>
            );
          }
          if ('hrefSuffix' in item && item.hrefSuffix) {
            return (
              <Link
                key={item.id}
                href={`/vendor/${vendorId}${item.hrefSuffix}`}
                className={cn(sectionNavClass, 'inline-flex items-center')}
              >
                {item.label}
              </Link>
            );
          }
          return (
            <button
              key={item.id}
              type="button"
              className={cn(sectionNavClass, tab === item.id && sectionNavActiveClass)}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {tab === 'overview' ? (
        <div className="space-y-6">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Store code</dt>
              <dd>{store.storeCode ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Type</dt>
              <dd className="capitalize">{store.storeType ?? 'online'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Currency</dt>
              <dd>{store.settings.currencyCode}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Timezone</dt>
              <dd>{store.settings.timezone ?? 'Asia/Dhaka'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">City</dt>
              <dd>{store.address?.city ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Online orders</dt>
              <dd>{store.settings.acceptsOnlineOrders ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Staff</dt>
              <dd>
                {staff.length} ·{' '}
                <button
                  type="button"
                  className="underline underline-offset-4"
                  onClick={() => setTab('staff')}
                >
                  Manage permissions
                </button>
              </dd>
            </div>
          </dl>

          <VendorSalesTrendsWidget
            storeId={storeId}
            title={`${store.profile.displayName} Sales & Revenue`}
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <ProductPerformanceWidget storeId={storeId} />
            <RefundAnalyticsWidget storeId={storeId} />
          </div>
        </div>
      ) : null}

      {tab === 'staff' ? (
        <section className="space-y-4 rounded-md border border-border bg-background p-4">
          <div>
            <h3 className="text-sm font-medium">Store staff &amp; permissions</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Assign managers and staff by user ID. Requires vendor owner or store manager access.
              The user must already exist in the platform.
            </p>
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="px-2 py-1 font-medium">User</th>
                  <th className="px-2 py-1 font-medium">Role</th>
                  <th className="px-2 py-1 font-medium">Added</th>
                  <th className="px-2 py-1 font-medium" />
                </tr>
              </thead>
              <tbody>
                {staff.length === 0 ? (
                  <tr>
                    <td className="px-2 py-3 text-muted-foreground" colSpan={4}>
                      No staff assigned yet.
                    </td>
                  </tr>
                ) : (
                  staff.map((member) => (
                    <tr key={`${member.userId}-${member.role}`} className="border-b border-border">
                      <td className="px-2 py-1 font-mono text-xs">{member.userId}</td>
                      <td className="px-2 py-1">{member.role}</td>
                      <td className="px-2 py-1 text-muted-foreground">
                        {new Date(member.addedAt).toLocaleString()}
                      </td>
                      <td className="px-2 py-1 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() =>
                            void runStaffAction(
                              () => removeVendorStoreStaff(storeId, member.userId),
                              'Staff member removed.',
                            )
                          }
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <form
            onSubmit={(e) => void onAddStaff(e)}
            className="flex flex-wrap items-end gap-3 border-t border-border pt-4"
          >
            <label className="flex min-w-[14rem] flex-col gap-1 text-sm">
              <span className="text-muted-foreground">User ID</span>
              <input
                className="h-10 rounded-md border border-border bg-background px-3"
                value={staffUserId}
                onChange={(e) => setStaffUserId(e.target.value)}
                required
                placeholder="UUID"
                autoComplete="off"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Role</span>
              <select
                className="h-10 rounded-md border border-border bg-background px-3"
                value={staffRole}
                onChange={(e) => setStaffRole(e.target.value as StoreStaffRole)}
              >
                <option value="STORE_STAFF">STORE_STAFF</option>
                <option value="STORE_MANAGER">STORE_MANAGER</option>
              </select>
            </label>
            <Button type="submit" size="sm" disabled={pending || !staffUserId.trim()}>
              {pending ? 'Saving…' : 'Add staff'}
            </Button>
          </form>
        </section>
      ) : null}

      {tab === 'settings' ? (
        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            Full settings editing is available during store setup or via admin for platform ops.
            Manage staff roles on the Staff tab.
          </p>
          {(store.status === 'provisioning' || store.status === 'failed') && (
            <Link
              className="underline underline-offset-4"
              href={`/vendor/${vendorId}/stores/${storeId}/setup`}
            >
              View provisioning status
            </Link>
          )}
        </div>
      ) : null}
    </div>
  );
}
