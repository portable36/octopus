'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthPanel } from '@/components/auth/auth-panel';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import { refreshSession, verifyEmailToken } from '@/lib/auth-api';
import { getAccessToken } from '@/lib/auth-session';

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const fromQuery = searchParams.get('token');
    if (fromQuery?.trim()) {
      setToken(fromQuery.trim());
    }
  }, [searchParams]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await verifyEmailToken(token.trim());
      if (getAccessToken()) {
        try {
          await refreshSession();
        } catch {
          // Token refresh is best-effort after verify.
        }
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Verification failed.');
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthPanel
      activeTab="login"
      title="Verify your email"
      description="Paste the verification token from your email (or the local devToken response)."
    >
      {done ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground" role="status">
            Email verified. You can continue shopping or sign in again to refresh your session.
          </p>
          <Button asChild className="w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Verification token</span>
            <input
              name="token"
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="min-h-11 rounded-md border border-border bg-background px-3"
              autoComplete="one-time-code"
            />
          </label>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending || !token.trim()}>
            {pending ? 'Verifying…' : 'Verify email'}
          </Button>
        </form>
      )}
    </AuthPanel>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-muted-foreground">Loading…</p>}>
      <VerifyEmailForm />
    </Suspense>
  );
}
