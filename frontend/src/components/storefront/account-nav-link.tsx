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
      <span className="sf-action-link text-muted-foreground" aria-hidden>
        …
      </span>
    );
  }

  if (!authed) {
    return (
      <Link href="/login" className="sf-action-link">
        Sign in
      </Link>
    );
  }

  return (
    <span className="flex items-center gap-1">
      <Link href="/account" className="sf-action-link">
        Account
      </Link>
      <button
        type="button"
        className="sf-action-link"
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
