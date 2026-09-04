'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { Button } from '@/components/ui/button';
import { StoreWizardShell } from '@/components/vendor/store-wizard/store-wizard-shell';
import { ApiClientError } from '@/lib/api-client';
import { listAdminVendors, type AdminVendor } from '@/lib/admin-api';
import { createStoreDraft, type StoreOnboardingDraft } from '@/lib/store-wizard-flow';
import { useAccessToken } from '@/lib/use-access-token';

export default function AdminCreateStorePage() {
  const token = useAccessToken();
  const [vendors, setVendors] = useState<AdminVendor[]>([]);
  const [vendorId, setVendorId] = useState('');
  const [draft, setDraft] = useState<StoreOnboardingDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('Authentication token required.');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const rows = await listAdminVendors(token);
        if (cancelled) return;
        const active = rows.filter((v) => v.status === 'active');
        setVendors(active);
        setVendorId(active[0]?.id ?? '');
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load vendors.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onStart() {
    if (!vendorId || starting) return;
    setStarting(true);
    setError(null);
    try {
      const draftRow = await createStoreDraft(vendorId);
      setDraft(draftRow);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to start store draft.');
    } finally {
      setStarting(false);
    }
  }

  if (draft && vendorId) {
    return (
      <StoreWizardShell
        vendorId={vendorId}
        draft={draft}
        backHref="/admin/stores"
        successHref={(storeId) => `/admin/stores/${storeId}/overview`}
      />
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Create Store"
        description="Reuse the vendor onboarding wizard with a platform vendor picker."
      />
      <p className="text-sm text-muted-foreground">
        <Link href="/admin/stores" className="underline underline-offset-2">
          ← All Stores
        </Link>
      </p>
      {loading ? <p className="text-sm text-muted-foreground">Loading vendors…</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!loading ? (
        <div className="max-w-lg space-y-4 border border-border bg-background p-4">
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Vendor</span>
            <select
              className="w-full border border-border bg-background px-3 py-2"
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              disabled={vendors.length === 0}
            >
              {vendors.length === 0 ? (
                <option value="">No active vendors</option>
              ) : (
                vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.profile.displayName}
                  </option>
                ))
              )}
            </select>
          </label>
          <Button type="button" disabled={!vendorId || starting} onClick={() => void onStart()}>
            {starting ? 'Starting…' : 'Start wizard'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
