'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import {
  getStoreProvisioningStatus,
  retryStoreProvisioning,
  type ProvisioningStatus,
} from '@/lib/store-wizard-flow';
import { getVendorStore, type StoreSummary } from '@/lib/vendor-api';
import { setSelectedStoreId } from '@/lib/vendor-session';

export default function StoreSetupPage() {
  const params = useParams<{ vendorId: string; storeId: string }>();
  const { vendorId, storeId } = params;
  const [store, setStore] = useState<StoreSummary | null>(null);
  const [provisioning, setProvisioning] = useState<ProvisioningStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const reload = useCallback(async () => {
    const [storeRow, status] = await Promise.all([
      getVendorStore(storeId),
      getStoreProvisioningStatus(storeId),
    ]);
    setStore(storeRow);
    setProvisioning(status);
    if (storeRow.status === 'active') {
      setSelectedStoreId(storeId);
    }
  }, [storeId]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        await reload();
        if (!cancelled) setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load provisioning.');
        }
      }
    }

    void poll();
    const timer = setInterval(() => void poll(), 3000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [reload]);

  async function onRetry() {
    setRetrying(true);
    try {
      await retryStoreProvisioning(storeId);
      await reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Retry failed.');
    } finally {
      setRetrying(false);
    }
  }

  if (!store || !provisioning) {
    return <p className="text-sm text-muted-foreground">Loading provisioning status…</p>;
  }

  const isComplete = provisioning.run.status === 'completed' || store.status === 'active';
  const isFailed = provisioning.run.status === 'failed' || store.status === 'failed';

  return (
    <div className="space-y-6">
      <header>
        <Link
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          href={`/vendor/${vendorId}/stores`}
        >
          ← Stores
        </Link>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">{store.profile.displayName}</h2>
        <p className="text-sm text-muted-foreground">
          Status: <span className="uppercase">{store.status}</span>
        </p>
      </header>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="rounded-md border border-border bg-background p-4">
        <h3 className="text-sm font-medium">Provisioning progress</h3>
        <ul className="mt-3 space-y-2">
          {provisioning.steps.map((step) => (
            <li key={step.stepName} className="flex items-center justify-between text-sm">
              <span>{step.stepName}</span>
              <span
                className={
                  step.status === 'completed'
                    ? 'text-green-600'
                    : step.status === 'failed'
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                }
              >
                {step.status}
              </span>
            </li>
          ))}
        </ul>
        {provisioning.run.lastError ? (
          <p className="mt-3 text-sm text-destructive">{provisioning.run.lastError}</p>
        ) : null}
      </div>

      {isFailed ? (
        <Button type="button" disabled={retrying} onClick={() => void onRetry()}>
          {retrying ? 'Retrying…' : 'Retry provisioning'}
        </Button>
      ) : null}

      {isComplete ? (
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/vendor/${vendorId}/catalog`}
            className="inline-flex min-h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Go to catalog
          </Link>
          <Link
            href={`/vendor/${vendorId}/stores/${storeId}`}
            className="inline-flex min-h-10 items-center text-sm underline underline-offset-4"
          >
            Store details
          </Link>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Provisioning in progress…</p>
      )}
    </div>
  );
}
