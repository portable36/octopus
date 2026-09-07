'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import {
  getSystemHealthDiagnostics,
  getSystemHealthLive,
  getSystemHealthReady,
  type SystemHealthDiagnostics,
  type SystemHealthProbe,
} from '@/lib/admin-api';

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h < 24) return `${h}h ${remM}m`;
  const d = Math.floor(h / 24);
  const remH = h % 24;
  return `${d}d ${remH}h`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round((bytes / 1024 / 1024) * 10) / 10} MB`;
}

export default function AdminSystemHealthPage() {
  const [diagnostics, setDiagnostics] = useState<SystemHealthDiagnostics | null>(null);
  const [liveProbe, setLiveProbe] = useState<{ status: string; uptimeSec: number } | null>(null);
  const [readyProbe, setReadyProbe] = useState<SystemHealthProbe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [diagRes, liveRes, readyRes] = await Promise.allSettled([
        getSystemHealthDiagnostics(),
        getSystemHealthLive(),
        getSystemHealthReady(),
      ]);

      if (diagRes.status === 'fulfilled') {
        setDiagnostics(diagRes.value);
      } else {
        setError('Failed to fetch detailed system diagnostics.');
      }

      if (liveRes.status === 'fulfilled') {
        setLiveProbe(liveRes.value);
      }
      if (readyRes.status === 'fulfilled') {
        setReadyProbe(readyRes.value);
      }

      setLastRefreshed(new Date());
    } catch {
      setError('Failed to connect to health endpoints.');
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
    }, 10_000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const memUsagePercent = diagnostics
    ? Math.min(
        100,
        Math.round(
          (diagnostics.process.memory.heapUsedBytes / diagnostics.process.memory.heapTotalBytes) *
            100,
        ),
      )
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <AdminPageHeader
          title="System Health & Diagnostics"
          description="Real-time production liveness, dependency ping latencies, and BullMQ background worker queue metrics."
        />
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-border"
            />
            Auto-refresh (10s)
          </label>
          <button
            type="button"
            onClick={() => void fetchData()}
            disabled={loading}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            {loading ? 'Pinging…' : 'Ping now'}
          </button>
        </div>
      </div>

      {lastRefreshed ? (
        <p className="text-xs text-muted-foreground">
          Last checked: {lastRefreshed.toLocaleTimeString()}
        </p>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {/* Primary Probes Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Liveness Probe */}
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Liveness Probe
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                liveProbe?.status === 'ok'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
              }`}
            >
              {liveProbe?.status === 'ok' ? 'Alive' : 'Failing'}
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            {liveProbe?.uptimeSec !== undefined ? formatUptime(liveProbe.uptimeSec) : '—'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Process uptime • PID {diagnostics?.process.pid ?? '—'}
          </p>
        </div>

        {/* Readiness Probe */}
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Readiness Probe
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                readyProbe?.status === 'ok'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              }`}
            >
              {readyProbe?.status === 'ok' ? 'Ready' : (readyProbe?.status ?? 'Not ready')}
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            {diagnostics?.status === 'healthy' ? 'Operational' : 'Degraded'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Node {diagnostics?.process.nodeVersion ?? '—'} • {diagnostics?.process.platform ?? '—'}
          </p>
        </div>

        {/* Process Memory */}
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              V8 Heap Memory
            </span>
            <span className="text-xs font-medium text-muted-foreground">{memUsagePercent}%</span>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            {diagnostics
              ? `${diagnostics.process.memory.heapUsedMb} / ${diagnostics.process.memory.heapTotalMb} MB`
              : '—'}
          </p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                memUsagePercent > 85 ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${memUsagePercent}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            RSS: {diagnostics ? formatBytes(diagnostics.process.memory.rssBytes) : '—'}
          </p>
        </div>
      </div>

      {/* Dependency Ping Latency Dashboard */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Dependency Ping Latencies
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* PostgreSQL */}
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span className="font-semibold text-foreground">PostgreSQL</span>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  diagnostics?.dependencies.database.status === 'up'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                }`}
              >
                {diagnostics?.dependencies.database.status.toUpperCase() ?? 'UNKNOWN'}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-foreground">
                {diagnostics?.dependencies.database.latencyMs !== undefined
                  ? `${diagnostics.dependencies.database.latencyMs} ms`
                  : '—'}
              </span>
              <span className="text-xs text-muted-foreground">ping</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Primary relational store & transaction boundary
            </p>
            {diagnostics?.dependencies.database.error ? (
              <p className="mt-2 rounded bg-rose-500/10 p-1.5 text-xs text-rose-600">
                {diagnostics.dependencies.database.error}
              </p>
            ) : null}
          </div>

          {/* Redis */}
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <span className="font-semibold text-foreground">Redis</span>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  diagnostics?.dependencies.redis.status === 'up'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                }`}
              >
                {diagnostics?.dependencies.redis.status.toUpperCase() ?? 'UNKNOWN'}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-foreground">
                {diagnostics?.dependencies.redis.latencyMs !== undefined
                  ? `${diagnostics.dependencies.redis.latencyMs} ms`
                  : '—'}
              </span>
              <span className="text-xs text-muted-foreground">ping</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Cache, rate limiting & BullMQ queue coordinator
            </p>
            {diagnostics?.dependencies.redis.error ? (
              <p className="mt-2 rounded bg-rose-500/10 p-1.5 text-xs text-rose-600">
                {diagnostics.dependencies.redis.error}
              </p>
            ) : null}
          </div>

          {/* Meilisearch */}
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-pink-500" />
                <span className="font-semibold text-foreground">Meilisearch</span>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  diagnostics?.dependencies.meilisearch.status === 'up'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : diagnostics?.dependencies.meilisearch.status === 'disabled'
                      ? 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                }`}
              >
                {diagnostics?.dependencies.meilisearch.status.toUpperCase() ?? 'UNKNOWN'}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-foreground">
                {diagnostics?.dependencies.meilisearch.status === 'disabled'
                  ? 'Disabled'
                  : diagnostics?.dependencies.meilisearch.latencyMs !== undefined
                    ? `${diagnostics.dependencies.meilisearch.latencyMs} ms`
                    : '—'}
              </span>
              {diagnostics?.dependencies.meilisearch.status !== 'disabled' ? (
                <span className="text-xs text-muted-foreground">ping</span>
              ) : null}
            </div>
            <p className="mt-2 text-xs text-muted-foreground truncate">
              {diagnostics?.dependencies.meilisearch.host
                ? `Catalog search read-model (${diagnostics.dependencies.meilisearch.host})`
                : 'Catalog search read-model'}
            </p>
            {diagnostics?.dependencies.meilisearch.error ? (
              <p className="mt-2 rounded bg-rose-500/10 p-1.5 text-xs text-rose-600">
                {diagnostics.dependencies.meilisearch.error}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Background Worker Queues Dashboard */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Background Worker & BullMQ Queues
          </h3>
          {diagnostics?.workers.summary ? (
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>
                Total Queues:{' '}
                <strong className="text-foreground">
                  {diagnostics.workers.summary.totalQueues}
                </strong>
              </span>
              <span>
                Waiting:{' '}
                <strong className="text-foreground">
                  {diagnostics.workers.summary.totalWaiting}
                </strong>
              </span>
              <span>
                Active:{' '}
                <strong className="text-foreground">
                  {diagnostics.workers.summary.totalActive}
                </strong>
              </span>
              <span>
                Failed:{' '}
                <strong
                  className={
                    diagnostics.workers.summary.totalFailed > 0
                      ? 'text-rose-600 font-bold'
                      : 'text-foreground'
                  }
                >
                  {diagnostics.workers.summary.totalFailed}
                </strong>
              </span>
            </div>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/50 font-medium text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Queue Name</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Waiting</th>
                  <th className="px-4 py-3 text-right">Active</th>
                  <th className="px-4 py-3 text-right">Delayed</th>
                  <th className="px-4 py-3 text-right">Completed</th>
                  <th className="px-4 py-3 text-right">Failed</th>
                  <th className="px-4 py-3 text-right">Queue Lag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {diagnostics && diagnostics.workers.queues.length > 0 ? (
                  diagnostics.workers.queues.map((q) => (
                    <tr key={q.name} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono font-medium text-foreground">{q.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-semibold ${
                            q.status === 'healthy'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : q.status === 'degraded'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {q.paused ? 'PAUSED' : q.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                        {q.waiting}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                        {q.active > 0 ? (
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {q.active}
                          </span>
                        ) : (
                          0
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                        {q.delayed}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                        {q.completed}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {q.failed > 0 ? (
                          <span className="font-bold text-rose-600 dark:text-rose-400">
                            {q.failed}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {q.lagMs > 10_000 ? (
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            {formatUptime(Math.floor(q.lagMs / 1000))}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {q.lagMs > 0 ? `${q.lagMs}ms` : '0ms'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No BullMQ worker queues currently registered or active in this process.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Raw Health Probe Endpoints */}
      <details className="rounded-lg border border-border bg-card p-4 text-xs">
        <summary className="font-semibold text-muted-foreground cursor-pointer hover:text-foreground">
          View Raw Probe Endpoints & Diagnostic JSON
        </summary>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <h4 className="font-mono text-2xs font-semibold text-muted-foreground uppercase">
              GET /health/live
            </h4>
            <pre className="mt-1 max-h-48 overflow-auto rounded bg-muted/60 p-2 font-mono text-2xs">
              {JSON.stringify(liveProbe, null, 2)}
            </pre>
          </div>
          <div>
            <h4 className="font-mono text-2xs font-semibold text-muted-foreground uppercase">
              GET /health/ready
            </h4>
            <pre className="mt-1 max-h-48 overflow-auto rounded bg-muted/60 p-2 font-mono text-2xs">
              {JSON.stringify(readyProbe, null, 2)}
            </pre>
          </div>
          <div className="lg:col-span-2">
            <h4 className="font-mono text-2xs font-semibold text-muted-foreground uppercase">
              GET /health/diagnostics
            </h4>
            <pre className="mt-1 max-h-64 overflow-auto rounded bg-muted/60 p-2 font-mono text-2xs">
              {JSON.stringify(diagnostics, null, 2)}
            </pre>
          </div>
        </div>
      </details>
    </div>
  );
}
