'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useAccessToken } from '@/lib/use-access-token';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiClientError } from '@/lib/api-client';
import {
  createAdminBlockedIp,
  deleteAdminBlockedIp,
  listAdminAuditEvents,
  listAdminBlockedIps,
  updateAdminBlockedIp,
  type AdminAuditEvent,
  type AdminBlockedIp,
} from '@/lib/admin-api';

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
  const token = useAccessToken();
  const [logins, setLogins] = useState<AdminAuditEvent[]>([]);
  const [security, setSecurity] = useState<AdminAuditEvent[]>([]);
  const [blocks, setBlocks] = useState<AdminBlockedIp[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [blockError, setBlockError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [ipCidr, setIpCidr] = useState('');
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editExpiresAt, setEditExpiresAt] = useState('');
  const [editActive, setEditActive] = useState(true);

  const reloadBlocks = useCallback(async (accessToken: string) => {
    const result = await listAdminBlockedIps(accessToken);
    setBlocks(result.items);
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('Authentication token required.');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [loginRows, securityRows, blocked] = await Promise.all([
          listAdminAuditEvents(token, { limit: 50, actionPrefix: 'auth.login' }),
          listAdminAuditEvents(token, { limit: 50, actionPrefix: 'auth.' }),
          listAdminBlockedIps(token),
        ]);
        if (!cancelled) {
          setLogins(loginRows);
          setSecurity(securityRows);
          setBlocks(blocked.items);
          setError(null);
          setBlockError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load security data.');
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

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setPending(true);
    setBlockError(null);
    try {
      await createAdminBlockedIp(token, {
        ipCidr: ipCidr.trim(),
        ...(reason.trim() ? { reason: reason.trim() } : {}),
        ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
      });
      setIpCidr('');
      setReason('');
      setExpiresAt('');
      await reloadBlocks(token);
    } catch (err) {
      setBlockError(err instanceof ApiClientError ? err.message : 'Failed to add blocked IP.');
    } finally {
      setPending(false);
    }
  }

  function startEdit(row: AdminBlockedIp) {
    setEditingId(row.id);
    setEditReason(row.reason ?? '');
    setEditExpiresAt(row.expiresAt ? row.expiresAt.slice(0, 16) : '');
    setEditActive(row.isActive);
    setBlockError(null);
  }

  async function onSaveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !editingId) return;
    setPending(true);
    setBlockError(null);
    try {
      await updateAdminBlockedIp(token, editingId, {
        reason: editReason.trim() ? editReason.trim() : null,
        expiresAt: editExpiresAt ? new Date(editExpiresAt).toISOString() : null,
        isActive: editActive,
      });
      setEditingId(null);
      await reloadBlocks(token);
    } catch (err) {
      setBlockError(err instanceof ApiClientError ? err.message : 'Failed to update blocked IP.');
    } finally {
      setPending(false);
    }
  }

  async function onDelete(id: string) {
    if (!token) return;
    if (!window.confirm('Remove this IP from the denylist?')) return;
    setPending(true);
    setBlockError(null);
    try {
      await deleteAdminBlockedIp(token, id);
      if (editingId === id) setEditingId(null);
      await reloadBlocks(token);
    } catch (err) {
      setBlockError(err instanceof ApiClientError ? err.message : 'Failed to delete blocked IP.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Security"
        description="Blocked IPs, login history, and auth security events."
      />
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!loading && !error ? (
        <>
          <section className="space-y-3">
            <h3 className="text-lg font-medium">Blocked IPs</h3>
            <p className="text-sm text-muted-foreground">
              Manual denylist enforced by Nest middleware (health probes exempt). Edit updates
              reason, expiry, and active flag — change IP by delete + add.
            </p>
            {blockError ? <p className="text-sm text-destructive">{blockError}</p> : null}

            <form
              onSubmit={(e) => void onCreate(e)}
              className="grid gap-3 rounded-lg border border-border p-4 md:grid-cols-4"
            >
              <div className="space-y-1.5 md:col-span-1">
                <Label htmlFor="block-ip">IP / CIDR</Label>
                <Input
                  id="block-ip"
                  value={ipCidr}
                  onChange={(e) => setIpCidr(e.target.value)}
                  placeholder="203.0.113.10 or 10.0.0.0/8"
                  required
                />
              </div>
              <div className="space-y-1.5 md:col-span-1">
                <Label htmlFor="block-reason">Reason</Label>
                <Input
                  id="block-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Abuse / scraping"
                />
              </div>
              <div className="space-y-1.5 md:col-span-1">
                <Label htmlFor="block-expires">Expires (optional)</Label>
                <Input
                  id="block-expires"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={pending || !ipCidr.trim()}>
                  Add block
                </Button>
              </div>
            </form>

            <div className="overflow-x-auto rounded-lg border border-border bg-background">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-border text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">IP / CIDR</th>
                    <th className="px-3 py-2 font-medium">Reason</th>
                    <th className="px-3 py-2 font-medium">Expires</th>
                    <th className="px-3 py-2 font-medium">Active</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {blocks.length === 0 ? (
                    <tr>
                      <td className="px-3 py-4 text-muted-foreground" colSpan={5}>
                        No blocked IPs yet.
                      </td>
                    </tr>
                  ) : (
                    blocks.map((row) => (
                      <tr key={row.id} className="border-b border-border last:border-0 align-top">
                        <td className="px-3 py-2 font-mono text-xs">{row.ipCidr}</td>
                        <td className="px-3 py-2 text-sm">{row.reason ?? '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {row.expiresAt ? new Date(row.expiresAt).toLocaleString() : 'Permanent'}
                        </td>
                        <td className="px-3 py-2">{row.isActive ? 'Yes' : 'No'}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={pending}
                              onClick={() => startEdit(row)}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={pending}
                              onClick={() => void onDelete(row.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {editingId ? (
              <form
                onSubmit={(e) => void onSaveEdit(e)}
                className="grid gap-3 rounded-lg border border-border p-4 md:grid-cols-4"
              >
                <div className="space-y-1.5 md:col-span-1">
                  <Label htmlFor="edit-reason">Reason</Label>
                  <Input
                    id="edit-reason"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-1">
                  <Label htmlFor="edit-expires">Expires</Label>
                  <Input
                    id="edit-expires"
                    type="datetime-local"
                    value={editExpiresAt}
                    onChange={(e) => setEditExpiresAt(e.target.value)}
                  />
                </div>
                <div className="flex items-end gap-2 md:col-span-1">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editActive}
                      onChange={(e) => setEditActive(e.target.checked)}
                    />
                    Active
                  </label>
                </div>
                <div className="flex items-end gap-2">
                  <Button type="submit" disabled={pending}>
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : null}
          </section>

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
