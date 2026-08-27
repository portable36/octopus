'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { apiRequest, ApiClientError } from '@/lib/api-client';
import { getAccessToken } from '@/lib/auth-session';
import { cn } from '@/lib/cn';

type MeResponse = {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
};

type NavItem = {
  href: string;
  label: string;
  permission?: string;
};

const NAV: readonly NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', permission: 'platform.dashboard.read' },
  { href: '/admin/vendors', label: 'Vendors', permission: 'platform.vendors.read' },
  { href: '/admin/stores', label: 'Stores', permission: 'platform.stores.read' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/payments', label: 'Payments' },
  { href: '/admin/inventory', label: 'Inventory' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/system/health', label: 'System health' },
  { href: '/admin/system/reports', label: 'Reports' },
  { href: '/admin/system/security', label: 'Security', permission: 'audit.read' },
  { href: '/admin/system/website', label: 'Website' },
  { href: '/admin/system/marketing', label: 'Marketing' },
  { href: '/admin/system/commerce', label: 'Commerce' },
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

function canAccessAdmin(me: MeResponse): boolean {
  if (me.roles.includes('PLATFORM_ADMIN')) {
    return true;
  }
  return me.permissions.some(
    (permission) =>
      permission.startsWith('platform.') ||
      permission === 'audit.read' ||
      permission.startsWith('settings.'),
  );
}

export function AdminShell({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authState, setAuthState] = useState<'loading' | 'ok' | 'denied'>('loading');

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      const next = pathname.startsWith('/') ? pathname : '/admin/dashboard';
      router.replace(`/login?next=${encodeURIComponent(next)}`);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const profile = await apiRequest<MeResponse>('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) {
          return;
        }
        if (!canAccessAdmin(profile)) {
          setMe(profile);
          setAuthState('denied');
          setError('This account does not have admin access.');
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

  const permissions = useMemo(() => new Set(me?.permissions ?? []), [me]);
  const isPlatformAdmin = me?.roles.includes('PLATFORM_ADMIN') === true;

  const visibleNav = NAV.filter(
    (item) => !item.permission || isPlatformAdmin || permissions.has(item.permission),
  );

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
        <aside className="hidden w-56 shrink-0 border-r border-border bg-background p-4 md:block">
          <div className="mb-6 space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Octopus Admin</p>
            <p className="text-sm font-medium">{scopeLabel(me?.roles ?? [])} scope</p>
            {me ? <p className="truncate text-xs text-muted-foreground">{me.email}</p> : null}
          </div>
          <nav className="space-y-1">
            {visibleNav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
          </nav>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-border bg-background px-4 py-3 md:px-6">
            <div>
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
