'use client';

import Link from 'next/link';
import { type CSSProperties, type ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ConsentManager } from '@/components/marketing/consent-manager';
import { GoogleTagManager } from '@/components/marketing/GoogleTagManager';
import { TrackingService } from '@/components/marketing/tracking-service';
import { AccountNavLink } from '@/components/storefront/account-nav-link';
import { CartNavLink } from '@/components/storefront/cart-nav-link';
import { getPublicAppName } from '@/lib/env';
import {
  DEFAULT_THEME_SETTINGS,
  fetchStorefrontConfig,
  type ThemeSettings,
} from '@/lib/storefront-config-api';

const DEFAULT_NAV = [
  { href: '/', label: 'Home' },
  { href: '/categories', label: 'Categories' },
  { href: '/stores', label: 'Stores' },
  { href: '/search', label: 'Search' },
] as const;

export function StorefrontShell({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [siteName, setSiteName] = useState(getPublicAppName());
  const [brandStyle, setBrandStyle] = useState<CSSProperties | undefined>(undefined);
  const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_THEME_SETTINGS);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const config = await fetchStorefrontConfig();
        if (cancelled) {
          return;
        }
        if (config.theme) {
          setTheme(config.theme);
        }
        const name = config.branding.siteName?.trim();
        if (name) {
          setSiteName(name);
        }
        const styleObj: Record<string, string> = {};
        const accent = config.theme?.colors?.accent?.trim() || config.branding.primaryColor?.trim();
        if (accent) {
          styleObj['--cf-accent'] = accent;
        }
        const primary = config.theme?.colors?.primary?.trim();
        if (primary) {
          styleObj['--cf-primary'] = primary;
        }
        if (Object.keys(styleObj).length > 0) {
          setBrandStyle(styleObj as CSSProperties);
        }
      } catch {
        // Fall back to env app name / default theme.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const navLinks =
    theme.header.navLinks && theme.header.navLinks.length > 0 ? theme.header.navLinks : DEFAULT_NAV;

  return (
    <div
      className="sf-theme flex min-h-screen flex-col bg-background text-foreground"
      style={brandStyle}
    >
      <header className="sf-header border-b border-border">
        {theme.announcementBar.enabled ? (
          <div
            className="sf-announcement"
            style={{
              backgroundColor: theme.colors.announcementBg || undefined,
              color: theme.colors.announcementText || undefined,
            }}
          >
            <div className="sf-utility-inner">
              <span>{theme.announcementBar.text}</span>
              <span className="sf-utility-links">
                {theme.announcementBar.linkText && theme.announcementBar.linkUrl ? (
                  <Link href={theme.announcementBar.linkUrl} style={{ color: 'inherit' }}>
                    {theme.announcementBar.linkText}
                  </Link>
                ) : (
                  <Link href="/account/orders" style={{ color: 'inherit' }}>
                    Track order
                  </Link>
                )}
                <Link href="/vendor" style={{ color: 'inherit' }}>
                  Sell on Octopus
                </Link>
              </span>
            </div>
          </div>
        ) : null}
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
          <form
            className="sf-search-form"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              const query = searchQuery.trim();
              router.push(query ? `/search?q=${encodeURIComponent(query)}` : '/search');
              setMenuOpen(false);
            }}
          >
            <label className="sr-only" htmlFor="storefront-search">
              {theme.header.searchPlaceholder || 'Search products'}
            </label>
            <input
              id="storefront-search"
              className="sf-search-input"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={theme.header.searchPlaceholder || 'Search products'}
            />
            <button className="sf-search-submit" type="submit">
              Search
            </button>
          </form>
          <nav className="sf-nav" aria-label="Primary">
            {navLinks.map((item) => (
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
        <nav className="sf-category-nav" aria-label="Browse">
          <Link href="/categories">Shop all categories</Link>
          <Link href="/search?stockStatus=IN_STOCK">In stock now</Link>
          <Link href="/search?sort=newest">New arrivals</Link>
        </nav>
        {menuOpen ? (
          <nav id="storefront-mobile-nav" className="sf-mobile-nav" aria-label="Mobile primary">
            <form
              className="sf-mobile-search"
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                const query = searchQuery.trim();
                router.push(query ? `/search?q=${encodeURIComponent(query)}` : '/search');
                setMenuOpen(false);
              }}
            >
              <label className="sr-only" htmlFor="storefront-mobile-search">
                {theme.header.searchPlaceholder || 'Search products'}
              </label>
              <input
                id="storefront-mobile-search"
                className="sf-search-input"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={theme.header.searchPlaceholder || 'Search products'}
              />
              <button className="sf-search-submit" type="submit">
                Search
              </button>
            </form>
            {navLinks.map((item) => (
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
            <p className="sf-eyebrow">{siteName} marketplace</p>
            <p className="mt-3 text-sm">
              {theme.footer.aboutText ||
                'A multi-vendor marketplace built for confident browsing, clear delivery, and server-confirmed checkout.'}
            </p>
          </div>
          <div className="sf-footer-links">
            {theme.footer.columns && theme.footer.columns.length > 0 ? (
              theme.footer.columns.map((col, idx) => (
                <div key={idx}>
                  <p className="sf-footer-heading">{col.title}</p>
                  {col.links.map((link, lIdx) => (
                    <Link key={lIdx} href={link.href}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              ))
            ) : (
              <>
                <div>
                  <p className="sf-footer-heading">Shop</p>
                  <Link href="/categories">Categories</Link>
                  <Link href="/search">All offers</Link>
                </div>
                <div>
                  <p className="sf-footer-heading">Help</p>
                  <Link href="/account/orders">Track order</Link>
                  <Link href="/account">Account</Link>
                </div>
                <div>
                  <p className="sf-footer-heading">Sell</p>
                  <Link href="/vendor">Open vendor portal</Link>
                </div>
              </>
            )}
          </div>
          <div className="sf-footer-meta">
            <span>
              © {new Date().getFullYear()} {theme.footer.copyrightText || siteName}
            </span>
            <span>
              Prices and availability are confirmed by the server.{' '}
              <Link href="/admin/dashboard">Admin</Link>
            </span>
          </div>
        </div>
      </footer>
      <ConsentManager />
      <GoogleTagManager />
      <TrackingService />
    </div>
  );
}
