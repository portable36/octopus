'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClientError } from '@/lib/api-client';
import { beginMfaSetup, enableMfa } from '@/lib/auth-api';

export default function MfaSetupPage() {
  const router = useRouter();
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const setupRequested = useRef(false);

  useEffect(() => {
    if (setupRequested.current) {
      return;
    }
    setupRequested.current = true;
    void (async () => {
      try {
        setSetup(await beginMfaSetup());
      } catch (err) {
        setupRequested.current = false;
        setError(err instanceof ApiClientError ? err.message : 'Could not start MFA setup.');
      }
    })();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await enableMfa(code.trim());
      router.replace('/admin/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'The MFA code was not accepted.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header className="space-y-2">
        <p className="sf-eyebrow">Security checkpoint</p>
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Set up MFA</h1>
        <p className="text-sm text-muted-foreground">
          Platform admin accounts must enable an authenticator before opening the control plane.
        </p>
      </header>

      {error ? (
        <p className="sf-panel text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {setup ? (
        <form onSubmit={(event) => void onSubmit(event)} className="sf-panel sf-form">
          <p className="text-sm">
            Add this key to your authenticator app. A QR-code generator is not required for this
            setup; the standard <code>otpauth</code> link is provided below.
          </p>
          <label>
            <span>Secret key</span>
            <code className="block break-all rounded-md border border-border bg-muted p-3 text-sm">
              {setup.secret}
            </code>
          </label>
          <label>
            <span>Authenticator link</span>
            <code className="block break-all rounded-md border border-border bg-muted p-3 text-sm">
              {setup.otpauthUrl}
            </code>
          </label>
          <label>
            <span>Verification code</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              minLength={6}
              maxLength={8}
              required
            />
          </label>
          <button type="submit" className="sf-button-primary border-0" disabled={pending}>
            {pending ? 'Enabling MFA…' : 'Enable MFA and continue'}
          </button>
        </form>
      ) : !error ? (
        <p className="text-sm text-muted-foreground">Preparing secure setup…</p>
      ) : null}
    </div>
  );
}
