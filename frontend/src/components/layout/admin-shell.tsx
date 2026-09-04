'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { ApiClientError } from '@/lib/api-client';
import { ensureAccessToken, fetchMe, logoutAccount, type MeResponse } from '@/lib/auth-api';
import { cn } from '@/lib/cn';
import { hasPlatformAdminRole } from '@/lib/role-admission';

type NavItem = {
  href: string;
  label: string;
  permission: string;
};

type NavGroup = {
  label: string;
  items: readonly NavItem[];
};

const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', permission: 'platform.dashboard.read' },
      { href: '/admin/vendors', label: 'Vendors', permission: 'platform.vendors.read' },
      { href: '/admin/orders', label: 'Orders', permission: 'platform.orders.read' },
      { href: '/admin/payments', label: 'Payments', permission: 'platform.payments.read' },
      { href: '/admin/users', label: 'Users', permission: 'platform.users.read' },
    ],
  },
  {
    label: 'Stores',
    items: [
      { href: '/admin/stores', label: 'All Stores', permission: 'platform.stores.read' },
      { href: '/admin/stores/create', label: 'Create Store', permission: 'platform.stores.write' },
      {
        href: '/admin/stores/provisioning',
        label: 'Provisioning',
        permission: 'platform.stores.read',
      },
      {
        href: '/admin/system/commerce',
        label: 'Store Settings',
        permission: 'settings.read',
      },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/admin/system/health', label: 'System health', permission: 'settings.read' },
      { href: '/admin/system/reports', label: 'Reports', permission: 'platform.reports.read' },
      { href: '/admin/system/security', label: 'Security', permission: 'audit.read' },
      { href: '/admin/system/website', label: 'Website', permission: 'settings.read' },
      {
        href: '/admin/system/global-config',
        label: 'Platform config',
        permission: 'settings.read',
      },
      { href: '/admin/system/marketing', label: 'Marketing', permission: 'settings.read' },
      { href: '/admin/system/seo', label: 'SEO', permission: 'settings.read' },
      { href: '/admin/system/commerce', label: 'Commerce', permission: 'settings.read' },
    ],
  },
];

function scopeLabel(roles: readonly string[]): string {
  if (roles.includes('PLATFORM_ADMIN')) {
    return 'Platform';
  }
  if (roles.includes('VENDOR_OWNER') || roles.includes('VENDOR_STAFF')) {
    return 'Vendor';
  }
  if (roles.includes('STORE_MANAGER') || roles.includes('STORE_STAFF')) {
    return 'Store';
  }
  return 'User';
}

export function AdminShell({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authState, setAuthState] = useState<'loading' | 'ok' | 'denied'>('loading');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = await ensureAccessToken();
        if (!token) {
          router.replace(`/login?next=${encodeURIComponent(pathname || '/admin/dashboard')}`);
          return;
        }
        const profile = await fetchMe();
        if (cancelled) {
          return;
        }
        if (!hasPlatformAdminRole(profile.roles)) {
          setMe(profile);
          setAuthState('denied');
          setError('This account is not a platform administrator.');
          return;
        }
        setMe(profile);
        setAuthState('ok');
        setError(null);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setMe(null);
        setAuthState('denied');
        if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
          return;
        }
        setError(err instanceof ApiClientError ? err.message : 'Failed to load profile.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const permissions = useMemo(() => new Set(me?.permissions ?? []), [me]);
  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => permissions.has(item.permission)),
  })).filter((group) => group.items.length > 0);

  if (authState === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 text-sm text-muted-foreground">
        Checking admin session…
      </div>
    );
  }

  if (authState === 'denied') {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-4">
        <h1 className="text-xl font-semibold">Admin access required</h1>
        <p className="text-sm text-muted-foreground">
          {error ?? 'Sign in with a platform admin account to continue.'}
        </p>
        <Link href="/login?next=/admin/dashboard" className="text-sm underline">
          Sign in
        </Link>
        <Link href="/" className="text-sm text-muted-foreground underline">
          Back to storefront
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 text-foreground">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="hidden w-60 shrink-0 border-r border-border bg-background p-4 md:block">
          <div className="mb-6 space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Octopus Admin</p>
            <p className="text-sm font-medium">{scopeLabel(me?.roles ?? [])} control plane</p>
            {me ? <p className="truncate text-xs text-muted-foreground">{me.email}</p> : null}
          </div>
          <AdminNavigation groups={visibleGroups} pathname={pathname} />
          <button
            type="button"
            className="mt-6 min-h-11 w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => void logoutAccount().then(() => router.push('/'))}
          >
            Sign out
          </button>
        </aside>
        {mobileNavOpen ? (
          <div className="fixed inset-0 z-20 md:hidden" role="presentation">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Close admin navigation"
              onClick={() => setMobileNavOpen(false)}
            />
            <aside className="relative z-10 h-full w-72 max-w-[85vw] overflow-y-auto bg-background p-4 shadow-xl">
              <div className="mb-6 space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Octopus Admin
                </p>
                <p className="text-sm font-medium">{scopeLabel(me?.roles ?? [])} control plane</p>
              </div>
              <AdminNavigation groups={visibleGroups} pathname={pathname} />
              <button
                type="button"
                className="mt-6 min-h-11 w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => void logoutAccount().then(() => router.push('/'))}
              >
                Sign out
              </button>
            </aside>
          </div>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-3 md:px-6">
            <button
              type="button"
              className="min-h-11 rounded-md border border-border px-3 text-sm md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-expanded={mobileNavOpen}
              aria-controls="admin-mobile-navigation"
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              {mobileNavOpen ? 'Close' : 'Menu'}
            </button>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Platform admin
              </p>
              <h1 className="text-lg font-semibold tracking-tight">Control plane</h1>
            </div>
            <span className="rounded-md border border-border px-2 py-1 text-xs">
              {scopeLabel(me?.roles ?? [])}
            </span>
          </header>
          <main className="flex-1 space-y-6 px-4 py-6 md:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

function AdminNavigation({
  groups,
  pathname,
}: {
  readonly groups: readonly { label: string; items: readonly NavItem[] }[];
  readonly pathname: string;
}) {
  return (
    <nav id="admin-mobile-navigation" className="space-y-5" aria-label="Admin">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {group.label}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => {
              const active =
                item.href === '/admin/stores'
                  ? pathname === '/admin/stores'
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={`${item.href}-${item.label}`}
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
          </div>
        </div>
      ))}
    </nav>
  );
}
