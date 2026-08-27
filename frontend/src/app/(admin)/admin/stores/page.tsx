'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAccessToken } from '@/lib/use-access-token';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { ApiClientError } from '@/lib/api-client';
import { listAdminStores, type AdminStore } from '@/lib/admin-api';

export default function AdminStoresPage() {
  const token = useAccessToken();
  const [rows, setRows] = useState<AdminStore[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('Authentication token required.');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const data = await listAdminStores(token);
        if (!cancelled) {
          setRows(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load stores.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Stores"
        description="Platform store list and lifecycle ops over existing Store handlers."
      />
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!loading && !error ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-background">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Slug</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Vendor</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-muted-foreground" colSpan={4}>
                    No stores yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/stores/${row.id}`}
                        className="underline underline-offset-2 hover:text-foreground"
                      >
                        {row.profile.displayName}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{row.profile.slug}</td>
                    <td className="px-3 py-2">{row.status}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.vendorId}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
