'use client';

import Link from 'next/link';
import { type CSSProperties, type ReactNode, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();
  const [siteName, setSiteName] = useState(getPublicAppName());
  const [brandStyle, setBrandStyle] = useState<CSSProperties | undefined>(undefined);
  const [menuOpen, setMenuOpen] = useState(false);

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
          setBrandStyle({ '--cf-accent': color } as CSSProperties);
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
    <div
      className="sf-theme flex min-h-screen flex-col bg-background text-foreground"
      style={brandStyle}
    >
      <header className="sf-header border-b border-border">
        <div className="sf-announcement">
          <span>Delivery across Bangladesh</span>
          <span aria-hidden="true">·</span>
          <span>Server-confirmed prices at checkout</span>
        </div>
        <div className="sf-header-main">
          <button
            type="button"
            className="sf-menu-trigger"
            aria-expanded={menuOpen}
            aria-controls="storefront-mobile-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? 'Close' : 'Menu'}
          </button>
          <Link href="/" className="sf-brand" onClick={() => setMenuOpen(false)}>
            <span className="sf-brand-mark" aria-hidden="true">
              O.
            </span>
            <span className="sf-brand-copy">
              <strong>{siteName}</strong>
              <small>Marketplace</small>
            </span>
          </Link>
          <nav className="sf-nav" aria-label="Primary">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="sf-actions">
            <AccountNavLink />
            <CartNavLink />
          </div>
        </div>
        {menuOpen ? (
          <nav id="storefront-mobile-nav" className="sf-mobile-nav" aria-label="Mobile primary">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? 'page' : undefined}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </header>
      <main className="sf-main flex-1">{children}</main>
      <footer className="sf-footer">
        <div className="sf-footer-inner">
          <div className="sf-footer-brand">
            <p className="sf-eyebrow">Octopus marketplace</p>
            <p className="mt-3 text-sm">
              A multi-vendor marketplace built for confident browsing, clear delivery, and
              server-confirmed checkout.
            </p>
          </div>
          <div className="sf-footer-meta">
            <span>
              © {new Date().getFullYear()} {siteName}
            </span>
            <span>
              Prices and availability are confirmed by the server.{' '}
              <Link href="/admin/dashboard">Admin</Link>
            </span>
          </div>
        </div>
      </footer>
      <ConsentManager />
      <TrackingService />
    </div>
  );
}
