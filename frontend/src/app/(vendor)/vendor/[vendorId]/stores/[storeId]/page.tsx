'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { sectionNavActiveClass, sectionNavClass } from '@/components/vendor/catalog/catalog-styles';
import { ApiClientError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { getVendorStore, type StoreSummary } from '@/lib/vendor-api';
import { setSelectedStoreId } from '@/lib/vendor-session';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'catalog', label: 'Products', hrefSuffix: '/catalog' },
  { id: 'inventory', label: 'Inventory', hrefSuffix: '/inventory' },
  { id: 'orders', label: 'Orders', hrefSuffix: '/orders' },
  { id: 'finance', label: 'Finance', hrefSuffix: '/finance' },
  { id: 'settings', label: 'Settings' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function VendorStoreDetailPage() {
  const params = useParams<{ vendorId: string; storeId: string }>();
  const { vendorId, storeId } = params;
  const [store, setStore] = useState<StoreSummary | null>(null);
  const [tab, setTab] = useState<TabId>('overview');
  const [error, setError] = useState<string | null>(null);

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

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (!store) {
    return <p className="text-sm text-muted-foreground">Loading store…</p>;
  }

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
        <p className="text-sm text-muted-foreground font-mono">
          {store.storeCode ?? store.profile.slug} · {store.status}
        </p>
      </header>

      <nav className="flex flex-wrap gap-2">
        {TABS.map((item) => {
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
        </dl>
      ) : null}

      {tab === 'settings' ? (
        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            Full settings editing is available during store setup or via admin for platform ops.
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
