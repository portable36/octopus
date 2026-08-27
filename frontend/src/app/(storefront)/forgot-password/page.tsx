'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { AuthPanel } from '@/components/auth/auth-panel';
import { FieldWithIcon, UserFieldIcon } from '@/components/auth/field-with-icon';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import { requestPasswordReset } from '@/lib/auth-api';

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      await requestPasswordReset(String(form.get('email') || '').trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Request failed.');
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthPanel
      activeTab="login"
      title="Reset password"
      description={
        sent
          ? 'If that email exists, a reset link will be sent shortly.'
          : 'Enter your account email and we’ll send reset instructions.'
      }
    >
      {sent ? (
        <p className="text-center text-sm">
          <Link href="/login" className="font-medium underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      ) : (
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
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
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Sending…' : 'Send reset link'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="underline-offset-4 hover:underline">
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </AuthPanel>
  );
}
