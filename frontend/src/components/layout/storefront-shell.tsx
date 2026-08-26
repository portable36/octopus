'use client';

import Link from 'next/link';
import { type CSSProperties, type ReactNode, useEffect, useState } from 'react';
import { ConsentManager } from '@/components/marketing/consent-manager';
import { TrackingService } from '@/components/marketing/tracking-service';
import { AccountNavLink } from '@/components/storefront/account-nav-link';
import { CartNavLink } from '@/components/storefront/cart-nav-link';
import { getPublicAppName } from '@/lib/env';
import { fetchStorefrontConfig } from '@/lib/storefront-config-api';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/categories', label: 'Categories' },
  { href: '/search', label: 'Search' },
] as const;

export function StorefrontShell({ children }: { readonly children: ReactNode }) {
  const [siteName, setSiteName] = useState(getPublicAppName());
  const [brandStyle, setBrandStyle] = useState<CSSProperties | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const config = await fetchStorefrontConfig();
        if (cancelled) {
          return;
        }
        const name = config.branding.siteName?.trim();
        if (name) {
          setSiteName(name);
        }
        const color = config.branding.primaryColor?.trim();
        if (color) {
          setBrandStyle({ '--brand': color } as CSSProperties);
        }
      } catch {
        // Fall back to env app name / no brand color.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground" style={brandStyle}>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            {siteName}
          </Link>
          <nav className="flex flex-wrap items-center gap-1" aria-label="Primary">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            <AccountNavLink />
            <CartNavLink />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-6">{children}</main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between md:px-6">
          <p>
            © {new Date().getFullYear()} {siteName}
          </p>
          <p>
            Prices and availability are confirmed by the server at checkout.{' '}
            <Link href="/admin/dashboard" className="underline hover:text-foreground">
              Admin
            </Link>
          </p>
        </div>
      </footer>
      <ConsentManager />
      <TrackingService />
    </div>
  );
}
