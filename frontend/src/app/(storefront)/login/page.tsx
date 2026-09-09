'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthPanel } from '@/components/auth/auth-panel';
import { FieldWithIcon, UserFieldIcon } from '@/components/auth/field-with-icon';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { ApiClientError } from '@/lib/api-client';
import {
  completeOAuth,
  loginAccount,
  MfaRequiredError,
  requestOtp,
  startOAuth,
  verifyMfaLogin,
  verifyOtp,
  type AuthUser,
} from '@/lib/auth-api';
import { resolvePostLoginDestination } from '@/lib/auth-destination';
import { listMyVendors } from '@/lib/vendor-api';

const REMEMBER_EMAIL_KEY = 'octopus_remember_email';

type SignInMode = 'password' | 'otp';
type OAuthProvider = 'google' | 'facebook';

function parseOAuthProvider(value: string | null): OAuthProvider | null {
  return value === 'google' || value === 'facebook' ? value : null;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [mode, setMode] = useState<SignInMode>('password');
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);
  const oauthHandled = useRef(false);

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

  async function finishLogin(user: AuthUser): Promise<void> {
    const isVendor = user.roles.some((role) => role === 'VENDOR_OWNER' || role === 'VENDOR_STAFF');
    let vendorIds: readonly string[] = [];
    if (isVendor) {
      try {
        const vendors = await listMyVendors();
        vendorIds = vendors.map((vendor) => vendor.id);
      } catch {
        // The vendor picker can surface the retriable membership error.
      }
    }
    router.push(
      resolvePostLoginDestination({
        user,
        vendorIds,
        next: searchParams.get('next'),
      }),
    );
    router.refresh();
  }

  useEffect(() => {
    if (oauthHandled.current || mfaToken) {
      return;
    }

    const mock = searchParams.get('oauth_mock') === '1';
    const provider = parseOAuthProvider(
      searchParams.get('oauth_provider') ?? searchParams.get('provider'),
    );
    const mockState = searchParams.get('oauth_state');
    const code = searchParams.get('code');
    const state = searchParams.get('state') ?? mockState;
    const next = searchParams.get('next');

    const shouldCompleteMock = Boolean(mock && provider && mockState);
    const shouldCompleteReal = Boolean(code && state && provider);

    if (!provider || (!shouldCompleteMock && !shouldCompleteReal)) {
      return;
    }

    const oauthCode = shouldCompleteMock ? 'mock-oauth-code' : code!;
    const oauthState = shouldCompleteMock ? mockState! : state!;

    oauthHandled.current = true;
    setPending(true);
    setError(null);

    void (async () => {
      try {
        const session = await completeOAuth({
          provider,
          code: oauthCode,
          state: oauthState,
        });
        const isVendor = session.user.roles.some(
          (role) => role === 'VENDOR_OWNER' || role === 'VENDOR_STAFF',
        );
        let vendorIds: readonly string[] = [];
        if (isVendor) {
          try {
            const vendors = await listMyVendors();
            vendorIds = vendors.map((vendor) => vendor.id);
          } catch {
            // The vendor picker can surface the retriable membership error.
          }
        }
        router.push(
          resolvePostLoginDestination({
            user: session.user,
            vendorIds,
            next,
          }),
        );
        router.refresh();
      } catch (err) {
        oauthHandled.current = false;
        setError(err instanceof ApiClientError ? err.message : 'OAuth sign-in failed.');
        setPending(false);
      }
    })();
  }, [searchParams, mfaToken, router]);

  async function onOAuthClick(provider: OAuthProvider) {
    setPending(true);
    setError(null);
    try {
      const { authorizationUrl } = await startOAuth(provider);
      window.location.assign(authorizationUrl);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not start OAuth.');
      setPending(false);
    }
  }

  async function onRequestOtp() {
    const normalized = phone.trim();
    if (!normalized) {
      setError('Enter your phone number.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await requestOtp(normalized);
      setOtpSent(true);
      setDevOtpCode(result.devCode ?? null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not send code.');
    } finally {
      setPending(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const submittedEmail = String(form.get('email') || '').trim();
    setPending(true);
    setError(null);
    try {
      if (mfaToken) {
        const session = await verifyMfaLogin({
          mfaToken,
          code: String(form.get('code') || '').trim(),
        });
        await finishLogin(session.user);
        return;
      }
      if (mode === 'otp') {
        const session = await verifyOtp({
          phone: phone.trim(),
          code: String(form.get('otp') || '').trim(),
        });
        await finishLogin(session.user);
        return;
      }
      const session = await loginAccount({
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
      await finishLogin(session.user);
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

  const title = mfaToken
    ? 'Verify it’s you'
    : mode === 'otp'
      ? 'Sign in with phone'
      : 'Welcome back';
  const description = mfaToken
    ? 'Enter the 6-digit code from your authenticator app.'
    : mode === 'otp'
      ? otpSent
        ? 'Enter the one-time code sent to your phone.'
        : 'We’ll text you a one-time code.'
      : 'Sign in with your email and password to continue.';

  return (
    <AuthPanel activeTab="login" title={title} description={description}>
      {!mfaToken ? (
        <div className="mb-4 grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={mode === 'password' ? 'default' : 'outline'}
            className="w-full"
            disabled={pending}
            onClick={() => {
              setMode('password');
              setError(null);
            }}
          >
            Email
          </Button>
          <Button
            type="button"
            variant={mode === 'otp' ? 'default' : 'outline'}
            className="w-full"
            disabled={pending}
            onClick={() => {
              setMode('otp');
              setError(null);
            }}
          >
            Phone OTP
          </Button>
        </div>
      ) : null}

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
        ) : mode === 'otp' ? (
          <>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Phone</span>
              <input
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setOtpSent(false);
                  setDevOtpCode(null);
                }}
                className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </label>
            {otpSent ? (
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">One-time code</span>
                <input
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
                {devOtpCode ? (
                  <span className="text-xs text-muted-foreground">Dev code: {devOtpCode}</span>
                ) : null}
              </label>
            ) : null}
          </>
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
        {mfaToken ? (
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Signing in…' : 'Verify'}
          </Button>
        ) : mode === 'otp' && !otpSent ? (
          <Button
            type="button"
            className="w-full"
            disabled={pending}
            onClick={() => void onRequestOtp()}
          >
            {pending ? 'Sending…' : 'Send code'}
          </Button>
        ) : (
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Signing in…' : mode === 'otp' ? 'Verify code' : 'Sign in'}
          </Button>
        )}
      </form>

      {!mfaToken ? (
        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" aria-hidden />
            <span>Or continue with</span>
            <div className="h-px flex-1 bg-border" aria-hidden />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={pending}
              onClick={() => void onOAuthClick('google')}
            >
              Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={pending}
              onClick={() => void onOAuthClick('facebook')}
            >
              Facebook
            </Button>
          </div>
        </div>
      ) : null}
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
