'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { ensureAccessToken } from '@/lib/auth-api';

const LINKS = [
  { href: '/account', label: 'Profile' },
  { href: '/account/addresses', label: 'Addresses' },
  { href: '/account/orders', label: 'Orders' },
] as const;

export default function AccountLayout({ children }: { readonly children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const token = await ensureAccessToken();
      if (cancelled) {
        return;
      }
      if (!token) {
        router.replace(`/login?next=${encodeURIComponent(pathname || '/account')}`);
        return;
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!ready) {
    return <p className="text-sm text-muted-foreground">Checking session…</p>;
  }

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2 border-b border-border pb-3" aria-label="Account">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={
                active
                  ? 'rounded-md bg-muted px-3 py-2 text-sm font-medium'
                  : 'rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted'
              }
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
