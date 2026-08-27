'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthPanel } from '@/components/auth/auth-panel';
import { FieldWithIcon, UserFieldIcon } from '@/components/auth/field-with-icon';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { ApiClientError } from '@/lib/api-client';
import { loginAccount, MfaRequiredError, verifyMfaLogin } from '@/lib/auth-api';

const REMEMBER_EMAIL_KEY = 'octopus_remember_email';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_EMAIL_KEY);
      if (saved?.trim()) {
        setEmail(saved.trim());
        setRememberMe(true);
      }
    } catch {
      // private mode / blocked storage
    }
  }, []);

  async function finishLogin(): Promise<void> {
    const next = searchParams.get('next') || '/account';
    router.push(next.startsWith('/') ? next : '/account');
    router.refresh();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const submittedEmail = String(form.get('email') || '').trim();
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
        email: submittedEmail,
        password: String(form.get('password') || ''),
      });
      try {
        if (rememberMe) {
          localStorage.setItem(REMEMBER_EMAIL_KEY, submittedEmail);
        } else {
          localStorage.removeItem(REMEMBER_EMAIL_KEY);
        }
      } catch {
        // ignore
      }
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
    <AuthPanel
      activeTab="login"
      title={mfaToken ? 'Verify it’s you' : 'Welcome back'}
      description={
        mfaToken
          ? 'Enter the 6-digit code from your authenticator app.'
          : 'Sign in with your email and password to continue.'
      }
    >
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
        {mfaToken ? (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Authenticator code</span>
            <input
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              pattern="\d{6}"
              className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </label>
        ) : (
          <>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Email</span>
              <FieldWithIcon
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<UserFieldIcon />}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Password</span>
              <PasswordInput name="password" required autoComplete="current-password" />
            </label>
            <div className="flex items-center justify-between gap-3 text-sm">
              <label className="flex items-center gap-2 text-muted-foreground">
                <input
                  type="checkbox"
                  className="size-4 rounded border border-border accent-foreground"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember me
              </label>
              <Link
                href="/forgot-password"
                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </>
        )}
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? 'Signing in…' : mfaToken ? 'Verify' : 'Sign in'}
        </Button>
      </form>
    </AuthPanel>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
