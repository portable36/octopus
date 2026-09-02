'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { ensureAccessToken, fetchMe, logoutAccount, type MeResponse } from '@/lib/auth-api';
import { ApiClientError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { listMyVendors, listStoresForVendor, type StoreSummary } from '@/lib/vendor-api';
import { getSelectedStoreId, setSelectedStoreId, subscribeSelectedStoreId } from '@/lib/vendor-session';
import { canAccessVendor, hasVendorRole } from '@/lib/role-admission';

type NavItem = {
  href: string;
  label: string;
  permission: string;
};

function vendorIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/vendor\/([^/]+)/);
  if (!match || match[1] === undefined) {
    return null;
  }
  // `/vendor` picker has no nested id; ignore reserved segments if any appear later
  return match[1];
}

function isVendorUser(me: MeResponse): boolean {
  return hasVendorRole(me.roles);
}

export function VendorShell({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const vendorId = vendorIdFromPath(pathname);
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [vendorStatus, setVendorStatus] = useState<string | null>(null);
  const [selectedStoreId, setSelectedStoreIdState] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
        if (cancelled) {
          return;
        }
        if (!isVendorUser(profile)) {
          setMe(profile);
          setError('This account does not have vendor access.');
          setReady(true);
          return;
        }
        const vendors = await listMyVendors();
        if (cancelled) {
          return;
        }
        if (
          !canAccessVendor(
            profile.roles,
            vendorId,
            vendors.map((vendor) => vendor.id),
          )
        ) {
          setError('This vendor is not available to your account.');
          setAuthorized(false);
          setReady(true);
          return;
        }
        const currentVendor = vendorId
          ? (vendors.find((vendor) => vendor.id === vendorId) ?? null)
          : null;
        setMe(profile);
        setVendorStatus(currentVendor?.status ?? null);
        setError(null);
        setAuthorized(true);
        setReady(true);
      } catch (err) {
        if (!cancelled) {
          setMe(null);
          setError(err instanceof ApiClientError ? err.message : 'Failed to load profile.');
          setAuthorized(false);
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, router, vendorId]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!vendorId || !ready) {
      setStores([]);
      return;
    }

    let cancelled = false;

    async function loadStores() {
      try {
        const rows = await listStoresForVendor(vendorId!);
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
    }

    void loadStores();
    const unsubscribe = subscribeSelectedStoreId(() => {
      void loadStores();
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [vendorId, ready]);

  const nav: readonly NavItem[] = useMemo(() => {
    if (!vendorId) {
      return [];
    }
    const base = `/vendor/${vendorId}`;
    if (vendorStatus !== 'active') {
      return [{ href: base, label: 'Dashboard', permission: 'vendor.manage' }];
    }
    return [
      { href: base, label: 'Dashboard', permission: 'vendor.manage' },
      { href: `${base}/stores`, label: 'Stores', permission: 'store.manage' },
      { href: `${base}/orders`, label: 'Orders', permission: 'order.read' },
      { href: `${base}/catalog`, label: 'Catalog', permission: 'catalog.product.read' },
      { href: `${base}/inventory`, label: 'Inventory', permission: 'inventory.read' },
      { href: `${base}/finance`, label: 'Finance', permission: 'finance.ledger.read' },
    ];
  }, [vendorId, vendorStatus]);

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

  if (!authorized) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-4">
        <h1 className="text-xl font-semibold">Vendor access required</h1>
        <p className="text-sm text-muted-foreground">
          {error ?? 'Sign in with an authorized vendor account to continue.'}
        </p>
        <Link href="/login?next=/vendor" className="text-sm underline">
          Sign in
        </Link>
        <Link href="/" className="text-sm text-muted-foreground underline">
          Back to storefront
        </Link>
      </div>
    );
  }

  const permissions = new Set(me?.permissions ?? []);
  const visibleNav = nav.filter((item) => permissions.has(item.permission));

  return (
    <div className="min-h-screen bg-muted/40 text-foreground">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="hidden w-60 shrink-0 border-r border-border bg-background p-4 md:block">
          <div className="mb-6 space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Octopus Vendor</p>
            <p className="text-sm font-medium">Ops portal</p>
            {me ? <p className="truncate text-xs text-muted-foreground">{me.email}</p> : null}
            {vendorId ? (
              <p className="truncate font-mono text-[11px] text-muted-foreground">{vendorId}</p>
            ) : null}
          </div>
          <VendorNavigation nav={visibleNav} pathname={pathname} vendorId={vendorId} />
          <VendorActions router={router} />
        </aside>
        {mobileNavOpen ? (
          <div className="fixed inset-0 z-20 md:hidden" role="presentation">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Close vendor navigation"
              onClick={() => setMobileNavOpen(false)}
            />
            <aside className="relative z-10 h-full w-72 max-w-[85vw] overflow-y-auto bg-background p-4 shadow-xl">
              <div className="mb-6 space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Octopus Vendor
                </p>
                <p className="text-sm font-medium">Ops portal</p>
              </div>
              <VendorNavigation nav={visibleNav} pathname={pathname} vendorId={vendorId} />
              <VendorActions router={router} />
            </aside>
          </div>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background px-4 py-3 md:px-6">
            <button
              type="button"
              className="min-h-11 rounded-md border border-border px-3 text-sm md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-expanded={mobileNavOpen}
              aria-controls="vendor-mobile-navigation"
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              {mobileNavOpen ? 'Close' : 'Menu'}
            </button>
            <div className="min-w-0">
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
            {vendorId && vendorStatus === 'active' && stores.length === 0 ? (
              <Link
                href={`/vendor/${vendorId}/stores/new`}
                className="text-sm font-medium underline underline-offset-4"
              >
                Create store
              </Link>
            ) : null}
          </header>
          <main className="flex-1 space-y-6 px-4 py-6 md:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

function VendorNavigation({
  nav,
  pathname,
  vendorId,
}: {
  readonly nav: readonly NavItem[];
  readonly pathname: string;
  readonly vendorId: string | null;
}) {
  return (
    <nav id="vendor-mobile-navigation" className="space-y-1" aria-label="Vendor">
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
              'flex min-h-11 items-center rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function VendorActions({ router }: { readonly router: ReturnType<typeof useRouter> }) {
  return (
    <>
      <Link
        href="/vendor"
        className="mt-4 flex min-h-11 items-center rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Switch vendor
      </Link>
      <button
        type="button"
        className="mt-2 min-h-11 w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => void logoutAccount().then(() => router.push('/'))}
      >
        Sign out
      </button>
    </>
  );
}
