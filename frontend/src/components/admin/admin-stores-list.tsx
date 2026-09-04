'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import {
  activateStore,
  archiveStore,
  getAdminStoreStats,
  listAdminStores,
  listAdminVendors,
  maintenanceStore,
  suspendStore,
  type AdminStoreListItem,
  type AdminStoreStats,
  type AdminVendor,
} from '@/lib/admin-api';
import { useAccessToken } from '@/lib/use-access-token';

const STATUS_OPTIONS = [
  '',
  'draft',
  'provisioning',
  'failed',
  'active',
  'suspended',
  'maintenance',
  'archived',
  'closed',
] as const;

type AdminStoresListProps = {
  readonly lockedStatus?: string;
  readonly title?: string;
  readonly description?: string;
};

export function AdminStoresList({
  lockedStatus,
  title = 'Stores',
  description = 'Platform store list, search, and lifecycle ops.',
}: AdminStoresListProps) {
  const token = useAccessToken();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get('q') ?? '';
  const status = lockedStatus ?? searchParams.get('status') ?? '';
  const vendorId = searchParams.get('vendorId') ?? '';
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);

  const [rows, setRows] = useState<AdminStoreListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [stats, setStats] = useState<AdminStoreStats | null>(null);
  const [vendors, setVendors] = useState<AdminVendor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState(q);

  useEffect(() => {
    setSearchDraft(q);
  }, [q]);

  const setParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === '') {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setError('Authentication token required.');
      return;
    }
    setLoading(true);
    try {
      const [list, statsRow, vendorRows] = await Promise.all([
        listAdminStores(token, {
          ...(q ? { q } : {}),
          ...(status ? { status } : {}),
          ...(vendorId ? { vendorId } : {}),
          page,
          limit: 20,
        }),
        getAdminStoreStats(token),
        listAdminVendors(token),
      ]);
      setRows(list.items);
      setTotal(list.total);
      setLimit(list.limit);
      setStats(statsRow);
      setVendors(vendorRows.filter((v) => v.status === 'active'));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load stores.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token, q, status, vendorId, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  async function runRowAction(storeId: string, action: () => Promise<unknown>): Promise<void> {
    if (!token || pendingId) return;
    setPendingId(storeId);
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Action failed.');
    } finally {
      setPendingId(null);
    }
  }

  const statCards = [
    { label: 'Total', value: stats?.total ?? 0 },
    { label: 'Active', value: stats?.byStatus.active ?? 0 },
    { label: 'Provisioning', value: stats?.byStatus.provisioning ?? 0 },
    { label: 'Failed', value: stats?.byStatus.failed ?? 0 },
    { label: 'Suspended', value: stats?.byStatus.suspended ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <AdminPageHeader title={title} description={description} />
        <Button asChild size="sm">
          <Link href="/admin/stores/create">Create Store</Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((card) => (
          <div key={card.label} className="border border-border bg-background px-3 py-3">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className="text-xl font-semibold tabular-nums">{card.value}</p>
          </div>
        ))}
      </div>

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setParams({ q: searchDraft.trim() || null, page: '1' });
        }}
      >
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Search</span>
          <input
            className="block w-64 border border-border bg-background px-3 py-2"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Name, code, slug, vendor…"
          />
        </label>
        {!lockedStatus ? (
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Status</span>
            <select
              className="block border border-border bg-background px-3 py-2"
              value={status}
              onChange={(e) => setParams({ status: e.target.value || null, page: '1' })}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt || 'all'} value={opt}>
                  {opt || 'All'}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Vendor</span>
          <select
            className="block max-w-xs border border-border bg-background px-3 py-2"
            value={vendorId}
            onChange={(e) => setParams({ vendorId: e.target.value || null, page: '1' })}
          >
            <option value="">All vendors</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.profile.displayName}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" size="sm" variant="outline">
          Apply
        </Button>
      </form>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!loading && !error ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-background">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Store</th>
                <th className="px-3 py-2 font-medium">Vendor</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Location</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Created</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-muted-foreground" colSpan={7}>
                    No stores match these filters.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const location = [row.location.city, row.location.countryCode]
                    .filter(Boolean)
                    .join(', ');
                  const busy = pendingId === row.id;
                  return (
                    <tr key={row.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">
                        <Link
                          href={`/admin/stores/${row.id}/overview`}
                          className="font-medium underline underline-offset-2"
                        >
                          {row.profile.displayName}
                        </Link>
                        <p className="font-mono text-xs text-muted-foreground">{row.storeCode}</p>
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/admin/vendors/${row.vendorId}`}
                          className="underline underline-offset-2"
                        >
                          {row.vendorDisplayName ?? row.vendorId.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="px-3 py-2">{row.storeType}</td>
                      <td className="px-3 py-2">{location || '—'}</td>
                      <td className="px-3 py-2">{row.status}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {new Date(row.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/admin/stores/${row.id}/overview`}>Open</Link>
                          </Button>
                          {row.status === 'provisioning' || row.status === 'failed' ? (
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/admin/stores/${row.id}/provisioning`}>
                                Provisioning
                              </Link>
                            </Button>
                          ) : null}
                          {row.status === 'active' ? (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() =>
                                  void runRowAction(row.id, () =>
                                    suspendStore(token!, row.id, 'Suspended from admin list'),
                                  )
                                }
                              >
                                Suspend
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() =>
                                  void runRowAction(row.id, () =>
                                    maintenanceStore(token!, row.id, 'Maintenance from admin list'),
                                  )
                                }
                              >
                                Maintenance
                              </Button>
                            </>
                          ) : null}
                          {row.status === 'suspended' || row.status === 'maintenance' ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() =>
                                void runRowAction(row.id, () => activateStore(token!, row.id))
                              }
                            >
                              Activate
                            </Button>
                          ) : null}
                          {row.status !== 'archived' && row.status !== 'closed' ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() =>
                                void runRowAction(row.id, () => archiveStore(token!, row.id))
                              }
                            >
                              Archive
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && total > 0 ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground">
            Page {page} of {totalPages} · {total} stores
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setParams({ page: String(page - 1) })}
            >
              Previous
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setParams({ page: String(page + 1) })}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
