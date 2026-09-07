'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import {
  queryAdminAuditEvents,
  type AdminAuditEvent,
  type AdminAuditFilterOptions,
} from '@/lib/admin-api';
import { useAccessToken } from '@/lib/use-access-token';

const ACTION_CATEGORIES = [
  { label: 'All Categories', value: '' },
  { label: 'Auth (login, logout, token)', value: 'auth.' },
  { label: 'Store (lifecycle, status)', value: 'store.' },
  { label: 'Vendor (lifecycle, approve)', value: 'vendor.' },
  { label: 'Permission (staff add/remove)', value: 'permission.' },
  { label: 'Catalog (products, offers)', value: 'catalog.' },
  { label: 'Inventory (adjustments)', value: 'inventory.' },
  { label: 'Orders (cancellation, status)', value: 'order.' },
  { label: 'Payments & Refunds', value: 'payment.' },
  { label: 'Payouts & Ledger', value: 'payout.' },
  { label: 'Settings & Config', value: 'settings.' },
] as const;

function getActionBadgeColor(action: string): string {
  if (action.startsWith('auth.'))
    return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
  if (action.startsWith('store.') || action.startsWith('vendor.')) {
    return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
  }
  if (action.startsWith('payment.') || action.startsWith('payout.')) {
    return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  }
  if (action.startsWith('permission.') || action.startsWith('settings.')) {
    return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
  }
  if (action.startsWith('inventory.')) {
    return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
  }
  return 'bg-muted text-foreground border-border';
}

export default function AdminAuditTrailPage() {
  const token = useAccessToken();
  const [events, setEvents] = useState<AdminAuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [category, setCategory] = useState<string>('');
  const [actionSearch, setActionSearch] = useState<string>('');
  const [resourceType, setResourceType] = useState<string>('');
  const [resourceId, setResourceId] = useState<string>('');
  const [storeId, setStoreId] = useState<string>('');
  const [vendorId, setVendorId] = useState<string>('');
  const [actorUserId, setActorUserId] = useState<string>('');

  // Pagination
  const pageSize = 25;
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * pageSize;
      const opts: AdminAuditFilterOptions = {
        limit: pageSize,
        offset,
        actionPrefix: category || undefined,
        action: actionSearch.trim() || undefined,
        resourceType: resourceType.trim() || undefined,
        resourceId: resourceId.trim() || undefined,
        storeId: storeId.trim() || undefined,
        vendorId: vendorId.trim() || undefined,
        actorUserId: actorUserId.trim() || undefined,
      };
      const result = await queryAdminAuditEvents(token, opts);
      setEvents(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load audit events.');
    } finally {
      setLoading(false);
    }
  }, [
    token,
    page,
    category,
    actionSearch,
    resourceType,
    resourceId,
    storeId,
    vendorId,
    actorUserId,
  ]);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void fetchEvents();
  };

  const handleResetFilters = () => {
    setCategory('');
    setActionSearch('');
    setResourceType('');
    setResourceId('');
    setStoreId('');
    setVendorId('');
    setActorUserId('');
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Audit Trail"
        description="Append-only immutable record of sensitive business operations across platform, vendor, and store contexts."
      />

      {/* Filter Toolbar */}
      <form
        onSubmit={handleFilterSubmit}
        className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            >
              {ACTION_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Action Name
            </label>
            <input
              type="text"
              placeholder="e.g. auth.login.failed"
              value={actionSearch}
              onChange={(e) => setActionSearch(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Resource Type
            </label>
            <input
              type="text"
              placeholder="e.g. store, user, order"
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Store ID</label>
            <input
              type="text"
              placeholder="UUID"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Vendor ID
            </label>
            <input
              type="text"
              placeholder="UUID"
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Resource ID
            </label>
            <input
              type="text"
              placeholder="UUID or Key"
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Actor User ID
            </label>
            <input
              type="text"
              placeholder="UUID"
              value={actorUserId}
              onChange={(e) => setActorUserId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="text-xs text-muted-foreground">
            Total records found: <strong className="text-foreground">{total}</strong>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleResetFilters}>
              Reset
            </Button>
            <Button type="submit" size="sm">
              Apply Filters
            </Button>
          </div>
        </div>
      </form>

      {error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {/* Events Table */}
      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Resource</th>
              <th className="px-4 py-3">Scope</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  Loading audit trail…
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  No audit events found matching the criteria.
                </td>
              </tr>
            ) : (
              events.map((evt) => {
                const isExpanded = expandedId === evt.id;
                return (
                  <tr key={evt.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">
                      <div>{new Date(evt.createdAt).toLocaleDateString()}</div>
                      <div className="font-mono text-[11px] opacity-80">
                        {new Date(evt.createdAt).toLocaleTimeString()}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-xs font-medium ${getActionBadgeColor(evt.action)}`}
                      >
                        {evt.action}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-xs">
                      <span className="font-medium text-foreground">{evt.resourceType}</span>
                      {evt.resourceId ? (
                        <div className="font-mono text-muted-foreground truncate max-w-[140px]">
                          {evt.resourceId}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-4 py-3 text-xs">
                      {evt.storeId ? (
                        <span className="inline-block rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono">
                          store:{evt.storeId.slice(0, 8)}…
                        </span>
                      ) : evt.vendorId ? (
                        <span className="inline-block rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono">
                          vendor:{evt.vendorId.slice(0, 8)}…
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Platform</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                      {evt.actorUserId ? `${evt.actorUserId.slice(0, 8)}…` : 'System'}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 px-2"
                        onClick={() => setExpandedId(isExpanded ? null : evt.id)}
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

      {/* Expanded Inspector Modal / Drawer */}
      {expandedId
        ? (() => {
            const item = events.find((e) => e.id === expandedId);
            if (!item) return null;
            return (
              <div className="rounded-lg border border-border bg-card p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      <span>Event Inspector:</span>
                      <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                        {item.action}
                      </code>
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      ID: <span className="font-mono">{item.id}</span> • Timestamp:{' '}
                      {new Date(item.createdAt).toISOString()}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setExpandedId(null)}
                  >
                    Close
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                  <div className="space-y-1 bg-muted/30 p-3 rounded-md border border-border">
                    <strong className="text-foreground block font-sans text-xs">
                      Actor & Scope
                    </strong>
                    <div>Actor: {item.actorUserId ?? 'System / Anonymous'}</div>
                    <div>Request ID: {item.requestId ?? '—'}</div>
                    <div>Vendor ID: {item.vendorId ?? '—'}</div>
                    <div>Store ID: {item.storeId ?? '—'}</div>
                    <div>
                      Resource: {item.resourceType}:{item.resourceId ?? '—'}
                    </div>
                  </div>

                  <div className="space-y-1 bg-muted/30 p-3 rounded-md border border-border col-span-2">
                    <strong className="text-foreground block font-sans text-xs">
                      Before State
                    </strong>
                    <pre className="max-h-36 overflow-auto text-[11px] p-2 bg-background rounded border border-border">
                      {item.before ? JSON.stringify(item.before, null, 2) : 'null'}
                    </pre>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="space-y-1 bg-muted/30 p-3 rounded-md border border-border">
                    <strong className="text-foreground block font-sans text-xs">After State</strong>
                    <pre className="max-h-48 overflow-auto text-[11px] p-2 bg-background rounded border border-border">
                      {item.after ? JSON.stringify(item.after, null, 2) : 'null'}
                    </pre>
                  </div>

                  <div className="space-y-1 bg-muted/30 p-3 rounded-md border border-border">
                    <strong className="text-foreground block font-sans text-xs">
                      Metadata (Secrets Redacted)
                    </strong>
                    <pre className="max-h-48 overflow-auto text-[11px] p-2 bg-background rounded border border-border">
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
