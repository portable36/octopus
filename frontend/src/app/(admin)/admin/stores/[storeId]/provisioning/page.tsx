'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import {
  getAdminStoreProvisioning,
  retryAdminStoreProvisioning,
  type AdminProvisioningStatus,
} from '@/lib/admin-api';
import { useAccessToken } from '@/lib/use-access-token';

export default function AdminStoreProvisioningPage() {
  const params = useParams<{ storeId: string }>();
  const token = useAccessToken();
  const storeId = params.storeId;
  const [provisioning, setProvisioning] = useState<AdminProvisioningStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    if (!token || !storeId) {
      setLoading(false);
      setError('Authentication token required.');
      return;
    }
    setLoading(true);
    try {
      const data = await getAdminStoreProvisioning(token, storeId);
      setProvisioning(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load provisioning.');
      setProvisioning(null);
    } finally {
      setLoading(false);
    }
  }, [token, storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onRetry() {
    if (!token || !storeId || pending) return;
    setPending(true);
    setMessage(null);
    try {
      await retryAdminStoreProvisioning(token, storeId);
      setMessage('Retry started.');
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Retry failed.');
    } finally {
      setPending(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading provisioning…</p>;
  if (error && !provisioning) return <p className="text-sm text-destructive">{error}</p>;

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      {provisioning ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <p>
                Run status: <span className="font-medium">{provisioning.run.status}</span>
              </p>
              {provisioning.run.lastError ? (
                <p className="text-destructive">{provisioning.run.lastError}</p>
              ) : null}
            </div>
            {provisioning.run.status === 'failed' ? (
              <Button type="button" size="sm" disabled={pending} onClick={() => void onRetry()}>
                Retry provisioning
              </Button>
            ) : null}
          </div>
          <ul className="space-y-1 border border-border bg-background p-4 text-sm">
            {provisioning.steps.map((step) => (
              <li key={step.stepName} className="flex justify-between gap-4">
                <span>{step.stepName}</span>
                <span className="text-muted-foreground">
                  {step.status}
                  {step.retryCount > 0 ? ` · retries ${step.retryCount}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">No provisioning run for this store.</p>
      )}
    </div>
  );
}
