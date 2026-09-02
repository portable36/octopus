'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { StoreWizardShell } from '@/components/vendor/store-wizard/store-wizard-shell';
import { ApiClientError } from '@/lib/api-client';
import { createStoreDraft, type StoreOnboardingDraft } from '@/lib/store-wizard-flow';
import { getVendor, type VendorSummary } from '@/lib/vendor-api';

export default function NewStoreWizardPage() {
  const params = useParams<{ vendorId: string }>();
  const router = useRouter();
  const vendorId = params.vendorId;
  const [draft, setDraft] = useState<StoreOnboardingDraft | null>(null);
  const [vendor, setVendor] = useState<VendorSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [vendorRow, draftRow] = await Promise.all([
          getVendor(vendorId),
          createStoreDraft(vendorId),
        ]);
        if (cancelled) return;
        if (vendorRow.status !== 'active') {
          router.replace(`/vendor/${vendorId}`);
          return;
        }
        setVendor(vendorRow);
        setDraft(draftRow);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Failed to start wizard.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vendorId, router]);

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (!draft || !vendor) {
    return <p className="text-sm text-muted-foreground">Starting store wizard…</p>;
  }

  return <StoreWizardShell vendorId={vendorId} draft={draft} />;
}
