'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { ApiClientError } from '@/lib/api-client';
import { listAdminAuditEvents, type AdminAuditEvent } from '@/lib/admin-api';

function EventTable({ rows, empty }: { readonly rows: AdminAuditEvent[]; readonly empty: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-background">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-border text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">When</th>
            <th className="px-3 py-2 font-medium">Action</th>
            <th className="px-3 py-2 font-medium">Actor</th>
            <th className="px-3 py-2 font-medium">Resource</th>
            <th className="px-3 py-2 font-medium">Metadata</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-3 py-4 text-muted-foreground" colSpan={5}>
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2 text-muted-foreground">
                  {new Date(row.createdAt).toLocaleString()}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{row.action}</td>
                <td className="px-3 py-2 font-mono text-xs">
                  {row.actorUserId ? `${row.actorUserId.slice(0, 8)}…` : '—'}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {row.resourceId
                    ? `${row.resourceType}:${row.resourceId.slice(0, 8)}…`
                    : row.resourceType}
                </td>
                <td className="max-w-xs truncate px-3 py-2 text-xs text-muted-foreground">
                  {row.metadata ? JSON.stringify(row.metadata) : '—'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminSecurityPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [logins, setLogins] = useState<AdminAuditEvent[]>([]);
  const [security, setSecurity] = useState<AdminAuditEvent[]>([]);
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
        const [loginRows, securityRows] = await Promise.all([
          listAdminAuditEvents(token, { limit: 50, actionPrefix: 'auth.login' }),
          listAdminAuditEvents(token, { limit: 50, actionPrefix: 'auth.' }),
        ]);
        if (!cancelled) {
          setLogins(loginRows);
          setSecurity(securityRows);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load security events.');
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
    <div className="space-y-8">
      <AdminPageHeader
        title="Security"
        description="Login history and auth security events from GET /admin/audit/events (Audit module)."
      />
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!loading && !error ? (
        <>
          <section className="space-y-3">
            <h3 className="text-lg font-medium">Login history</h3>
            <p className="text-sm text-muted-foreground">
              Filtered to <code className="text-xs">auth.login*</code> events.
            </p>
            <EventTable rows={logins} empty="No login events yet." />
          </section>
          <section className="space-y-3">
            <h3 className="text-lg font-medium">Security events</h3>
            <p className="text-sm text-muted-foreground">
              All <code className="text-xs">auth.*</code> events (login, logout, password, token
              reuse).
            </p>
            <EventTable rows={security} empty="No security events yet." />
          </section>
        </>
      ) : null}
    </div>
  );
}
