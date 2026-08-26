'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { ensureAccessToken, fetchMe, type MeResponse } from '@/lib/auth-api';
import { ApiClientError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { listStoresForVendor, type StoreSummary } from '@/lib/vendor-api';
import { getSelectedStoreId, setSelectedStoreId } from '@/lib/vendor-session';

type NavItem = {
  href: string;
  label: string;
};

function vendorIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/vendor\/([^/]+)/);
  if (!match || match[1] === undefined) {
    return null;
  }
  // `/vendor` picker has no nested id; ignore reserved segments if any appear later
  return match[1];
}

export function VendorShell({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const vendorId = vendorIdFromPath(pathname);
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [selectedStoreId, setSelectedStoreIdState] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const token = await ensureAccessToken();
      if (cancelled) {
        return;
      }
      if (!token) {
        router.replace(`/login?next=${encodeURIComponent(pathname || '/vendor')}`);
        return;
      }
      try {
        const profile = await fetchMe();
        if (!cancelled) {
          setMe(profile);
          setError(null);
          setReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          setMe(null);
          setError(err instanceof ApiClientError ? err.message : 'Failed to load profile.');
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  useEffect(() => {
    if (!vendorId || !ready) {
      setStores([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const rows = await listStoresForVendor(vendorId);
        if (cancelled) {
          return;
        }
        setStores(rows);
        const stored = getSelectedStoreId();
        const valid = stored && rows.some((s) => s.id === stored) ? stored : (rows[0]?.id ?? null);
        setSelectedStoreIdState(valid);
        setSelectedStoreId(valid);
      } catch {
        if (!cancelled) {
          setStores([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vendorId, ready]);

  const nav: readonly NavItem[] = useMemo(() => {
    if (!vendorId) {
      return [];
    }
    const base = `/vendor/${vendorId}`;
    return [
      { href: base, label: 'Dashboard' },
      { href: `${base}/stores`, label: 'Stores' },
      { href: `${base}/orders`, label: 'Orders' },
      { href: `${base}/catalog`, label: 'Catalog' },
      { href: `${base}/inventory`, label: 'Inventory' },
      { href: `${base}/finance`, label: 'Finance' },
    ];
  }, [vendorId]);

  function onStoreChange(next: string) {
    setSelectedStoreIdState(next || null);
    setSelectedStoreId(next || null);
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-muted/40 p-6 text-sm text-muted-foreground">
        Checking session…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 text-foreground">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="hidden w-56 shrink-0 border-r border-border bg-background p-4 md:block">
          <div className="mb-6 space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Octopus Vendor</p>
            <p className="text-sm font-medium">Ops portal</p>
            {me ? <p className="truncate text-xs text-muted-foreground">{me.email}</p> : null}
            {vendorId ? (
              <p className="truncate font-mono text-[11px] text-muted-foreground">{vendorId}</p>
            ) : null}
          </div>
          <nav className="space-y-1">
            {nav.map((item) => {
              const active =
                item.href === `/vendor/${vendorId}`
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'block rounded-md px-3 py-2 text-sm transition-colors',
                    active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/vendor"
              className="mt-4 block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
            >
              Switch vendor
            </Link>
          </nav>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background px-4 py-3 md:px-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Vendor portal</p>
              <h1 className="text-lg font-semibold tracking-tight">
                {vendorId ? 'Operations' : 'Select vendor'}
              </h1>
            </div>
            {vendorId && stores.length > 0 ? (
              <label className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Store</span>
                <select
                  className="h-9 rounded-md border border-border bg-background px-2"
                  value={selectedStoreId ?? ''}
                  onChange={(e) => onStoreChange(e.target.value)}
                >
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.profile.displayName}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </header>
          {error ? (
            <div className="border-b border-border bg-background px-4 py-2 text-sm text-destructive md:px-6">
              {error}
            </div>
          ) : null}
          <main className="flex-1 space-y-6 px-4 py-6 md:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
