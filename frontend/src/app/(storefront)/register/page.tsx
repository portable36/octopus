'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthPanel } from '@/components/auth/auth-panel';
import { FieldWithIcon, UserFieldIcon } from '@/components/auth/field-with-icon';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
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
    <AuthPanel
      activeTab="register"
      title="Create your account"
      description="Customer role by default. Your guest cart merges after you register."
    >
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Name</span>
          <input
            name="name"
            required
            minLength={1}
            autoComplete="name"
            className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Email</span>
          <FieldWithIcon
            name="email"
            type="email"
            required
            autoComplete="email"
            icon={<UserFieldIcon />}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Password</span>
          <PasswordInput name="password" required minLength={12} autoComplete="new-password" />
          <span className="text-xs text-muted-foreground">
            At least 12 characters, with upper, lower, number, and symbol.
          </span>
        </label>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? 'Creating…' : 'Create account'}
        </Button>
      </form>
    </AuthPanel>
  );
}
