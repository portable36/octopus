'use client';

import { useEffect, useState } from 'react';
import { apiRequest, ApiClientError } from '@/lib/api-client';

type ReadyResponse = {
  status?: string;
  info?: Record<string, { status: string }>;
  error?: Record<string, { status: string }>;
};

export function DashboardHealthWidget() {
  const [status, setStatus] = useState<string>('loading');
  const [detail, setDetail] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const live = await apiRequest<{ status: string }>('/health/live');
        let readyLabel = 'unknown';
        try {
          const ready = await apiRequest<ReadyResponse>('/health/ready');
          readyLabel = ready.status ?? 'ok';
        } catch (err) {
          readyLabel = err instanceof ApiClientError ? `degraded (${err.status})` : 'degraded';
        }
        if (!cancelled) {
          setStatus(live.status);
          setDetail(`live=${live.status}; ready=${readyLabel}`);
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setDetail(err instanceof ApiClientError ? err.message : 'Health check failed');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-1 text-sm">
      <p>
        Status: <span className="font-medium">{status}</span>
      </p>
      <p className="text-muted-foreground">{detail}</p>
    </div>
  );
}
