'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ensureAccessToken, logoutAccount } from '@/lib/auth-api';
import { clearAccessToken } from '@/lib/auth-session';

export function AccountNavLink() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const token = await ensureAccessToken();
      if (!cancelled) {
        setAuthed(Boolean(token));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (authed === null) {
    return (
      <span className="rounded-md px-3 py-2 text-sm text-muted-foreground" aria-hidden>
        …
      </span>
    );
  }

  if (!authed) {
    return (
      <Link
        href="/login"
        className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        Sign in
      </Link>
    );
  }

  return (
    <span className="flex items-center gap-1">
      <Link
        href="/account"
        className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        Account
      </Link>
      <button
        type="button"
        className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={() => {
          void (async () => {
            try {
              await logoutAccount();
            } catch {
              clearAccessToken();
            }
            window.location.href = '/';
          })();
        }}
      >
        Sign out
      </button>
    </span>
  );
}
