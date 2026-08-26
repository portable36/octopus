'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import { loginAccount } from '@/lib/auth-api';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      await loginAccount({
        email: String(form.get('email') || '').trim(),
        password: String(form.get('password') || ''),
      });
      const next = searchParams.get('next') || '/account';
      router.push(next.startsWith('/') ? next : '/account');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Sign-in failed.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          Refresh token stays in an HTTP-only cookie. Access token is never put in the URL.
        </p>
      </header>
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4 border border-border p-4">
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
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? 'Signing in…' : 'Sign in'}
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
