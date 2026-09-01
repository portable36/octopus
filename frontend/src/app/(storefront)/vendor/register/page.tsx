'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClientError } from '@/lib/api-client';
import { ensureAccessToken, refreshSession } from '@/lib/auth-api';
import { fetchStorefrontConfig } from '@/lib/storefront-config-api';
import { registerVendor, submitVendorForReview } from '@/lib/vendor-api';

export default function VendorRegistrationPage() {
  const router = useRouter();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchStorefrontConfig()
      .then((config) => {
        if (!cancelled) {
          setEnabled(config.general.vendorRegistrationEnabled);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError ? err.message : 'Could not load registration status.',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const token = await ensureAccessToken();
    if (!token) {
      router.push(`/login?next=${encodeURIComponent('/vendor/register')}`);
      return;
    }
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const vendor = await registerVendor({
        displayName: String(form.get('displayName') || '').trim(),
        legalName: String(form.get('legalName') || '').trim(),
        contactEmail: String(form.get('contactEmail') || '').trim(),
      });
      await submitVendorForReview(vendor.id);
      try {
        await refreshSession();
      } catch {
        // The application is saved; the next sign-in will refresh the role claim.
      }
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : 'Could not submit vendor application.',
      );
    } finally {
      setPending(false);
    }
  }

  if (enabled === null) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <p className="sf-eyebrow">Vendor onboarding</p>
        <h1 className="text-4xl font-semibold tracking-tight">
          {error ? 'Registration unavailable' : 'Checking registration'}
        </h1>
        <p className="text-sm text-muted-foreground" role={error ? 'alert' : undefined}>
          {error ?? 'Checking whether vendor applications are open…'}
        </p>
        <Link href="/account" className="sf-button-secondary inline-flex">
          Back to account
        </Link>
      </div>
    );
  }

  if (enabled === false) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <p className="sf-eyebrow">Vendor onboarding</p>
        <h1 className="text-4xl font-semibold tracking-tight">Registration is closed</h1>
        <p className="text-sm text-muted-foreground">
          Vendor applications are not currently being accepted. Please check back later.
        </p>
        <Link href="/account" className="sf-button-secondary inline-flex">
          Back to account
        </Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <p className="sf-eyebrow">Application received</p>
        <h1 className="text-4xl font-semibold tracking-tight">
          We’ll review your vendor application
        </h1>
        <p className="text-sm text-muted-foreground">
          Your application is under review. You can return to your account while the Platform
          reviews the details.
        </p>
        <Link href="/account" className="sf-button-primary inline-flex">
          Go to account
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header className="space-y-2">
        <p className="sf-eyebrow">Vendor onboarding</p>
        <h1 className="text-4xl font-semibold tracking-tight">Apply to sell</h1>
        <p className="text-sm text-muted-foreground">
          Submit your business details for Platform review. Approval is required before you can
          operate a vendor workspace.
        </p>
      </header>
      {error ? (
        <p className="sf-panel text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <form onSubmit={(event) => void onSubmit(event)} className="sf-panel sf-form">
        <label>
          <span>Vendor display name</span>
          <input name="displayName" minLength={2} maxLength={160} required />
        </label>
        <label>
          <span>Legal business name</span>
          <input name="legalName" minLength={2} maxLength={200} required />
        </label>
        <label>
          <span>Business contact email</span>
          <input name="contactEmail" type="email" required />
        </label>
        <button type="submit" className="sf-button-primary border-0" disabled={pending}>
          {pending ? 'Submitting…' : 'Submit for review'}
        </button>
      </form>
    </div>
  );
}
