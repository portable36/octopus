'use client';

import { useEffect, useState } from 'react';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { apiRequest, ApiClientError } from '@/lib/api-client';

export default function AdminSystemHealthPage() {
  const [live, setLive] = useState<string>('…');
  const [ready, setReady] = useState<string>('…');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const liveRes = await apiRequest<{ status: string }>('/health/live');
        if (!cancelled) {
          setLive(liveRes.status);
        }
        try {
          const readyRes = await apiRequest<{ status?: string }>('/health/ready');
          if (!cancelled) {
            setReady(readyRes.status ?? 'ok');
          }
        } catch (err) {
          if (!cancelled) {
            setReady(err instanceof ApiClientError ? `error ${err.status}` : 'error');
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Health probes failed.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <AdminPageHeader title="System health" description="Liveness and readiness probes." />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <dl className="grid max-w-md gap-3 rounded-lg border border-border bg-background p-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">GET /health/live</dt>
          <dd className="font-medium">{live}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">GET /health/ready</dt>
          <dd className="font-medium">{ready}</dd>
        </div>
      </dl>
    </div>
  );
}
