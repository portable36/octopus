'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import { getAdminStoreActivity, type AdminAuditEvent } from '@/lib/admin-api';
import { useAccessToken } from '@/lib/use-access-token';

function getActionBadgeColor(action: string): string {
  if (action.startsWith('store.')) {
    return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
  }
  if (action.startsWith('permission.')) {
    return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
  }
  if (action.startsWith('inventory.')) {
    return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
  }
  if (action.startsWith('order.') || action.startsWith('payment.')) {
    return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  }
  return 'bg-muted text-foreground border-border';
}

export default function AdminStoreActivityPage() {
  const params = useParams<{ storeId: string }>();
  const token = useAccessToken();
  const storeId = params.storeId;

  const [events, setEvents] = useState<AdminAuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [actionFilter, setActionFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const pageSize = 20;
  const [page, setPage] = useState(1);

  const loadActivity = useCallback(async () => {
    if (!token || !storeId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * pageSize;
      const res = await getAdminStoreActivity(token, storeId, {
        limit: pageSize,
        offset,
      });
      setEvents(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load store activity.');
    } finally {
      setLoading(false);
    }
  }, [token, storeId, page]);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  const filteredEvents = actionFilter
    ? events.filter((e) => e.action.startsWith(actionFilter))
    : events;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Store Activity Log</h2>
          <p className="text-sm text-muted-foreground">
            Audited store lifecycle, staff permissions, inventory, and order operations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs"
          >
            <option value="">All Store Actions</option>
            <option value="store.">Store Lifecycle (store.*)</option>
            <option value="permission.">Staff & Roles (permission.*)</option>
            <option value="inventory.">Inventory (inventory.*)</option>
            <option value="order.">Orders (order.*)</option>
            <option value="payment.">Payments (payment.*)</option>
          </select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadActivity()}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Resource</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted-foreground">
                  Loading activity log…
                </td>
              </tr>
            ) : filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted-foreground">
                  No activity events recorded for this store yet.
                </td>
              </tr>
            ) : (
              filteredEvents.map((row) => {
                const isExpanded = expandedId === row.id;
                return (
                  <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">
                      <div>{new Date(row.createdAt).toLocaleDateString()}</div>
                      <div className="font-mono text-[11px] opacity-80">
                        {new Date(row.createdAt).toLocaleTimeString()}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-xs font-medium ${getActionBadgeColor(row.action)}`}
                      >
                        {row.action}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-xs">
                      <span className="font-medium text-foreground">{row.resourceType}</span>
                      {row.resourceId ? (
                        <div className="font-mono text-muted-foreground truncate max-w-[150px]">
                          {row.resourceId}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                      {row.actorUserId ? `${row.actorUserId.slice(0, 8)}…` : 'System'}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 px-2"
                        onClick={() => setExpandedId(isExpanded ? null : row.id)}
                      >
                        {isExpanded ? 'Hide' : 'Inspect'}
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Expanded Inspector */}
      {expandedId
        ? (() => {
            const item = events.find((e) => e.id === expandedId);
            if (!item) return null;
            return (
              <div className="rounded-lg border border-border bg-card p-4 space-y-3 shadow-sm text-xs">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="font-semibold text-foreground">
                    Event Payload: <code className="font-mono">{item.action}</code>
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setExpandedId(null)}
                  >
                    Close
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono">
                  <div className="bg-muted/30 p-2.5 rounded border border-border">
                    <span className="font-sans font-medium block text-foreground mb-1">
                      After Mutation:
                    </span>
                    <pre className="max-h-36 overflow-auto text-[11px]">
                      {item.after ? JSON.stringify(item.after, null, 2) : 'null'}
                    </pre>
                  </div>
                  <div className="bg-muted/30 p-2.5 rounded border border-border">
                    <span className="font-sans font-medium block text-foreground mb-1">
                      Metadata & Context:
                    </span>
                    <pre className="max-h-36 overflow-auto text-[11px]">
                      {item.metadata ? JSON.stringify(item.metadata, null, 2) : 'null'}
                    </pre>
                  </div>
                </div>
              </div>
            );
          })()
        : null}

      {/* Pagination Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
        <div>
          Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} total
          records)
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
