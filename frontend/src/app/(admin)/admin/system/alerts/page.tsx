'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { ApiClientError } from '@/lib/api-client';
import { getSystemOpsAlerts, type SystemOpsAlerts } from '@/lib/admin-api';

function severityClass(severity: string): string {
  if (severity === 'critical') {
    return 'border-destructive/40 bg-destructive/10 text-destructive';
  }
  if (severity === 'warning') {
    return 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300';
  }
  return 'border-border bg-muted/40 text-muted-foreground';
}

export default function AdminSystemAlertsPage() {
  const [data, setData] = useState<SystemOpsAlerts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getSystemOpsAlerts();
      setData(result);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load ops alerts.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      void fetchData();
    }, 15_000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <AdminPageHeader
          title="Ops alerts"
          description="In-process evaluation of dependency, heap, and queue conditions. External pager / burn-rate wiring remains an ops host step."
        />
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-border"
            />
            Auto-refresh (15s)
          </label>
          <button
            type="button"
            onClick={() => void fetchData()}
            disabled={loading}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            {loading ? 'Checking…' : 'Evaluate now'}
          </button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <section className="space-y-2 border border-border bg-background p-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-medium">Current status</h2>
          {data ? (
            <span
              className={`rounded border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${severityClass(data.status === 'ok' ? 'ok' : data.status)}`}
            >
              {data.status}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
          {data ? (
            <span className="text-xs text-muted-foreground">
              Checked {new Date(data.timestamp).toLocaleString()} · diagnostics{' '}
              {data.diagnosticsStatus}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          Related:{' '}
          <Link href="/admin/system/health" className="underline underline-offset-2">
            System health
          </Link>
          . Restrict public <code className="text-[11px]">/health/*</code> at the edge in
          production.
        </p>
      </section>

      <section className="space-y-3 border border-border bg-background p-4">
        <h2 className="text-sm font-medium">Fired alerts</h2>
        {!data || data.fired.length === 0 ? (
          <p className="text-sm text-muted-foreground">No alerts firing.</p>
        ) : (
          <ul className="space-y-2">
            {data.fired.map((alert) => (
              <li
                key={alert.id}
                className={`rounded border px-3 py-2 text-sm ${severityClass(alert.severity)}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {alert.severity}
                  </span>
                  <span className="font-medium text-foreground">{alert.title}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{alert.id}</span>
                </div>
                <p className="mt-1 text-xs text-foreground/80">{alert.detail}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">source: {alert.source}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 border border-border bg-background p-4">
        <h2 className="text-sm font-medium">Rule catalog</h2>
        <p className="text-xs text-muted-foreground">
          In-app rules evaluate live. The burn-rate SLO rule is documented for external Prometheus /
          uptime provisioning.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                <th className="px-2 py-2 font-medium">Rule</th>
                <th className="px-2 py-2 font-medium">Severity</th>
                <th className="px-2 py-2 font-medium">Condition</th>
                <th className="px-2 py-2 font-medium">Runbook</th>
              </tr>
            </thead>
            <tbody>
              {(data?.rules ?? []).map((rule) => (
                <tr key={rule.id} className="border-b border-border/60 align-top">
                  <td className="px-2 py-2">
                    <div className="font-medium">{rule.name}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{rule.id}</div>
                  </td>
                  <td className="px-2 py-2 text-xs uppercase">{rule.severity}</td>
                  <td className="px-2 py-2 text-xs text-muted-foreground">{rule.condition}</td>
                  <td className="px-2 py-2 text-xs text-muted-foreground">{rule.runbook}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
