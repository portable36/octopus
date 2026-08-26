'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import { registerAccount } from '@/lib/auth-api';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      await registerAccount({
        email: String(form.get('email') || '').trim(),
        name: String(form.get('name') || '').trim(),
        password: String(form.get('password') || ''),
      });
      router.push('/account');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Registration failed.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
        <p className="text-sm text-muted-foreground">
          Customer role by default. Guest cart merges on the server after register.
        </p>
      </header>
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4 border border-border p-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Name</span>
          <input
            name="name"
            required
            minLength={1}
            autoComplete="name"
            className="h-10 rounded-md border border-border bg-background px-3"
          />
        </label>
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
          <span className="text-muted-foreground">Password (min 12)</span>
          <input
            name="password"
            type="password"
            required
            minLength={12}
            autoComplete="new-password"
            className="h-10 rounded-md border border-border bg-background px-3"
          />
        </label>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Register'}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
