'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import { loginAccount, MfaRequiredError, verifyMfaLogin } from '@/lib/auth-api';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);

  async function finishLogin(): Promise<void> {
    const next = searchParams.get('next') || '/account';
    router.push(next.startsWith('/') ? next : '/account');
    router.refresh();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      if (mfaToken) {
        await verifyMfaLogin({
          mfaToken,
          code: String(form.get('code') || '').trim(),
        });
        await finishLogin();
        return;
      }
      await loginAccount({
        email: String(form.get('email') || '').trim(),
        password: String(form.get('password') || ''),
      });
      await finishLogin();
    } catch (err) {
      if (err instanceof MfaRequiredError) {
        setMfaToken(err.mfaToken);
        setError(null);
      } else {
        setError(err instanceof ApiClientError ? err.message : 'Sign-in failed.');
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          {mfaToken
            ? 'Enter the 6-digit code from your authenticator app.'
            : 'Refresh token stays in an HTTP-only cookie. Access token is never put in the URL.'}
        </p>
      </header>
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4 border border-border p-4">
        {mfaToken ? (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Authenticator code</span>
            <input
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              pattern="\d{6}"
              className="h-10 rounded-md border border-border bg-background px-3"
            />
          </label>
        ) : (
          <>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Email</span>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="h-10 rounded-md border border-border bg-background px-3"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Password</span>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="h-10 rounded-md border border-border bg-background px-3"
              />
            </label>
          </>
        )}
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? 'Signing in…' : mfaToken ? 'Verify' : 'Sign in'}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        No account?{' '}
        <Link href="/register" className="underline">
          Register
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <LoginForm />
    </Suspense>
  );
}
