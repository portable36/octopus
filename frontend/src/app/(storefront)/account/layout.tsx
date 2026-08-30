'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { ensureAccessToken, logoutAccount } from '@/lib/auth-api';

const LINKS = [
  { href: '/account', label: 'Profile' },
  { href: '/account/addresses', label: 'Addresses' },
  { href: '/account/orders', label: 'Orders' },
] as const;

export default function AccountLayout({ children }: { readonly children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);
    void (async () => {
      try {
        const token = await ensureAccessToken();
        if (cancelled) {
          return;
        }
        if (!token) {
          router.replace(`/login?next=${encodeURIComponent(pathname || '/account')}`);
          return;
        }
        setReady(true);
      } catch {
        if (!cancelled) {
          setError('We could not restore your account session.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!ready) {
    if (error) {
      return (
        <div className="mx-auto flex min-h-[40vh] max-w-lg flex-col justify-center gap-4">
          <h1 className="text-xl font-semibold">Account unavailable</h1>
          <p className="text-sm text-muted-foreground" role="alert">
            {error}
          </p>
          <Link
            href={`/login?next=${encodeURIComponent(pathname || '/account')}`}
            className="text-sm underline"
          >
            Sign in again
          </Link>
          <Link href="/" className="text-sm text-muted-foreground underline">
            Back to storefront
          </Link>
        </div>
      );
    }
    return <p className="text-sm text-muted-foreground">Checking session…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Your account
        </p>
        <button
          type="button"
          className="min-h-11 rounded-md border border-border px-3 text-sm md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={mobileNavOpen}
          aria-controls="account-navigation"
          onClick={() => setMobileNavOpen((open) => !open)}
        >
          {mobileNavOpen ? 'Close' : 'Menu'}
        </button>
      </div>
      <nav
        id="account-navigation"
        className={`${mobileNavOpen ? 'flex' : 'hidden'} flex-col gap-1 border-b border-border pb-3 md:flex md:flex-row md:flex-wrap`}
        aria-label="Account"
      >
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileNavOpen(false)}
              className={
                active
                  ? 'flex min-h-11 items-center rounded-md bg-muted px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                  : 'flex min-h-11 items-center rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              }
            >
              {link.label}
            </Link>
          );
        })}
        <button
          type="button"
          className="flex min-h-11 items-center rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => void logoutAccount().then(() => router.push('/'))}
        >
          Sign out
        </button>
      </nav>
      {children}
    </div>
  );
}
