'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { Button } from '@/components/ui/button';
import { useAccessToken } from '@/lib/use-access-token';
import { ApiClientError } from '@/lib/api-client';
import {
  getSystemHealthDiagnostics,
  listAdminNotificationAttempts,
  listAdminNotificationDeliveries,
  listAdminNotificationTemplates,
  type AdminNotificationAttempt,
  type AdminNotificationDelivery,
  type AdminNotificationTemplate,
  type SystemHealthDiagnostics,
  type SystemQueueSnapshot,
} from '@/lib/admin-api';

const NOTIFICATION_QUEUES = new Set(['octopus.email', 'octopus.notification']);

export default function AdminSystemNotificationsPage() {
  const token = useAccessToken();
  const [templates, setTemplates] = useState<AdminNotificationTemplate[]>([]);
  const [deliveries, setDeliveries] = useState<AdminNotificationDelivery[]>([]);
  const [queues, setQueues] = useState<SystemQueueSnapshot[]>([]);
  const [attemptsById, setAttemptsById] = useState<Record<string, AdminNotificationAttempt[]>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [tpl, del, diag] = await Promise.all([
        listAdminNotificationTemplates(token),
        listAdminNotificationDeliveries(token, {
          limit: 50,
          ...(channelFilter ? { channel: channelFilter } : {}),
          ...(statusFilter ? { deliveryStatus: statusFilter } : {}),
        }),
        getSystemHealthDiagnostics(token).catch((): SystemHealthDiagnostics | null => null),
      ]);
      setTemplates(tpl.items);
      setDeliveries(del.items);
      setQueues((diag?.workers.queues ?? []).filter((q) => NOTIFICATION_QUEUES.has(q.name)));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load notification center.');
    } finally {
      setLoading(false);
    }
  }, [token, channelFilter, statusFilter]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function toggleAttempts(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!token || attemptsById[id]) {
      return;
    }
    try {
      const result = await listAdminNotificationAttempts(token, id);
      setAttemptsById((prev) => ({ ...prev, [id]: result.items }));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load attempts.');
    }
  }

  if (!token) {
    return (
      <p className="text-sm text-muted-foreground">
        Sign in as a platform admin to view the notification center.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Notifications"
        description="Read-only delivery plane: queue lag, templates, and recent sends. Customer inbox lives on the storefront; campaigns and provider webhooks remain deferred."
      />

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void reload()}
          disabled={loading}
        >
          Refresh
        </Button>
        <Link
          href="/admin/system/health"
          className="inline-flex min-h-9 items-center rounded-md border border-border px-3 text-sm underline-offset-2 hover:underline"
        >
          System health
        </Link>
        <Link
          href="/admin/system/alerts"
          className="inline-flex min-h-9 items-center rounded-md border border-border px-3 text-sm underline-offset-2 hover:underline"
        >
          Ops alerts
        </Link>
      </div>

      <section
        className="space-y-3 border border-border bg-background p-4"
        aria-labelledby="queue-heading"
      >
        <h2 id="queue-heading" className="text-sm font-medium">
          Queue health
        </h2>
        {queues.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No email/notification queue snapshots yet (workers may be offline).
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="px-2 py-1 font-medium">Queue</th>
                  <th className="px-2 py-1 font-medium">Waiting</th>
                  <th className="px-2 py-1 font-medium">Active</th>
                  <th className="px-2 py-1 font-medium">Failed</th>
                  <th className="px-2 py-1 font-medium">Lag</th>
                  <th className="px-2 py-1 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {queues.map((q) => (
                  <tr key={q.name} className="border-b border-border/60">
                    <td className="px-2 py-2 font-mono text-xs">{q.name}</td>
                    <td className="px-2 py-2 tabular-nums">{q.waiting}</td>
                    <td className="px-2 py-2 tabular-nums">{q.active}</td>
                    <td className="px-2 py-2 tabular-nums">{q.failed}</td>
                    <td className="px-2 py-2 tabular-nums">{q.lagMs}</td>
                    <td className="px-2 py-2">{q.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section
        className="space-y-3 border border-border bg-background p-4"
        aria-labelledby="tpl-heading"
      >
        <h2 id="tpl-heading" className="text-sm font-medium">
          Templates
        </h2>
        {loading && templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="px-2 py-1 font-medium">Key</th>
                  <th className="px-2 py-1 font-medium">Channel</th>
                  <th className="px-2 py-1 font-medium">Locale</th>
                  <th className="px-2 py-1 font-medium">Version</th>
                  <th className="px-2 py-1 font-medium">Subject</th>
                </tr>
              </thead>
              <tbody>
                {templates.length === 0 ? (
                  <tr>
                    <td className="px-2 py-3 text-muted-foreground" colSpan={5}>
                      No DB templates (built-in fallbacks still apply at send time).
                    </td>
                  </tr>
                ) : (
                  templates.map((t) => (
                    <tr key={t.id} className="border-b border-border/60">
                      <td className="px-2 py-2 font-mono text-xs">{t.templateKey}</td>
                      <td className="px-2 py-2">{t.channel}</td>
                      <td className="px-2 py-2">{t.locale}</td>
                      <td className="px-2 py-2 tabular-nums">{t.version}</td>
                      <td className="px-2 py-2 text-muted-foreground">{t.subject ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section
        className="space-y-3 border border-border bg-background p-4"
        aria-labelledby="del-heading"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="del-heading" className="text-sm font-medium">
            Recent deliveries
          </h2>
          <div className="flex flex-wrap gap-2 text-sm">
            <label className="flex items-center gap-1">
              <span className="text-muted-foreground">Channel</span>
              <select
                className="rounded-md border border-border bg-background px-2 py-1"
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="EMAIL">EMAIL</option>
                <option value="IN_APP">IN_APP</option>
                <option value="SMS">SMS</option>
                <option value="PUSH">PUSH</option>
              </select>
            </label>
            <label className="flex items-center gap-1">
              <span className="text-muted-foreground">Status</span>
              <select
                className="rounded-md border border-border bg-background px-2 py-1"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="PENDING">PENDING</option>
                <option value="SENT">SENT</option>
                <option value="FAILED">FAILED</option>
                <option value="SKIPPED">SKIPPED</option>
              </select>
            </label>
          </div>
        </div>
        {loading && deliveries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {deliveries.length === 0 ? (
              <li className="px-3 py-4 text-sm text-muted-foreground">
                No deliveries match filters.
              </li>
            ) : (
              deliveries.map((d) => (
                <li key={d.id} className="space-y-2 px-3 py-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium">{d.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.channel} · {d.deliveryStatus} · {d.templateKey}@v{d.templateVersion} ·{' '}
                        {new Date(d.createdAt).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Recipient {d.recipientEmailMasked ?? d.recipientUserId.slice(0, 8) + '…'}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void toggleAttempts(d.id)}
                    >
                      {expandedId === d.id ? 'Hide attempts' : 'Attempts'}
                    </Button>
                  </div>
                  {expandedId === d.id ? (
                    <div className="rounded-md bg-muted/40 px-3 py-2 text-xs">
                      {(attemptsById[d.id] ?? []).length === 0 ? (
                        <p className="text-muted-foreground">No attempts recorded.</p>
                      ) : (
                        <ul className="space-y-1">
                          {(attemptsById[d.id] ?? []).map((a) => (
                            <li key={a.id}>
                              #{a.attemptNumber} {a.status}
                              {a.errorCode ? ` · ${a.errorCode}` : ''}
                              {a.providerMessageId ? ` · ${a.providerMessageId}` : ''}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        )}
      </section>
    </div>
  );
}
