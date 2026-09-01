'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { Button } from '@/components/ui/button';
import { ApiClientError, apiRequest } from '@/lib/api-client';
import { useAccessToken } from '@/lib/use-access-token';

type GeneralSettings = {
  vendorRegistrationEnabled: boolean;
};

export default function AdminCommerceConfigPage() {
  const token = useAccessToken();
  const [vendorRegistrationEnabled, setVendorRegistrationEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('Sign in required to load commerce settings.');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const response = await apiRequest<{ value: GeneralSettings }>(
          '/admin/settings/effective?key=general&scopeKind=platform',
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!cancelled) {
          setVendorRegistrationEnabled(response.value.vendorRegistrationEnabled);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError ? err.message : 'Could not load commerce settings.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function saveVendorRegistration(): Promise<void> {
    if (!token || pending) {
      return;
    }
    setPending(true);
    setError(null);
    setSaved(null);
    try {
      await apiRequest('/admin/settings', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: {
          key: 'general',
          scopeKind: 'platform',
          payload: { vendorRegistrationEnabled },
        },
      });
      setSaved(
        vendorRegistrationEnabled
          ? 'Vendor registration is now enabled.'
          : 'Vendor registration is now disabled.',
      );
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not save vendor registration.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Commerce config"
        description="Control vendor onboarding and manage COD settings across the marketplace."
      />
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="text-sm text-muted-foreground" role="status">
          {saved}
        </p>
      ) : null}
      <section className="space-y-3 border border-border p-4 text-sm">
        <h2 className="font-medium">Vendor registration</h2>
        <p className="text-muted-foreground">
          When enabled, authenticated customers can submit vendor applications for admin review.
          Applications start in pending status and do not bypass approval.
        </p>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={vendorRegistrationEnabled}
            onChange={(event) => setVendorRegistrationEnabled(event.target.checked)}
            disabled={loading || pending}
          />
          Allow customer vendor applications
        </label>
        <Button
          type="button"
          onClick={() => void saveVendorRegistration()}
          disabled={loading || pending}
        >
          {pending ? 'Saving…' : 'Save vendor registration'}
        </Button>
      </section>
      <section className="space-y-3 border border-border p-4 text-sm">
        <h2 className="font-medium">Payment / COD</h2>
        <p className="text-muted-foreground">
          Enable COD and set min/max amounts (minor units) and reservation TTL on each vendor and
          store. Checkout requires both scopes enabled. No separate payment-provider admin UI yet.
        </p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <Link href={'/admin/vendors'} className="underline underline-offset-2">
              Vendors
            </Link>{' '}
            → open a vendor → COD settings
          </li>
          <li>
            <Link href={'/admin/stores'} className="underline underline-offset-2">
              Stores
            </Link>{' '}
            → open a store → COD settings
          </li>
        </ul>
      </section>
      <section className="space-y-2 border border-border p-4 text-sm">
        <h2 className="font-medium">Not available yet</h2>
        <ul className="list-inside list-disc space-y-1 text-muted-foreground">
          <li>
            Shipping / courier accounts — <code className="text-xs">CourierAccountStore</code> is
            internal; no public courier admin API.
          </li>
          <li>Tax / commission engines — deferred to later phases.</li>
        </ul>
      </section>
    </div>
  );
}
