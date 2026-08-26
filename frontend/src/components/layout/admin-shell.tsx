'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { apiRequest, ApiClientError } from '@/lib/api-client';
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

export function AdminShell({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? undefined;
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setMe(null);
      setError('Pass ?token=<accessToken> to load admin identity.');
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const profile = await apiRequest<MeResponse>('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) {
          setMe(profile);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setMe(null);
          setError(err instanceof ApiClientError ? err.message : 'Failed to load profile.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const permissions = useMemo(() => new Set(me?.permissions ?? []), [me]);
  const isPlatformAdmin = me?.roles.includes('PLATFORM_ADMIN') === true;

  const visibleNav = NAV.filter(
    (item) => !item.permission || isPlatformAdmin || permissions.has(item.permission),
  );

  const withToken = (href: string) => (token ? `${href}?token=${encodeURIComponent(token)}` : href);

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
                  href={withToken(item.href)}
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
