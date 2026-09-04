'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import {
  addStoreStaff,
  getAdminStore,
  removeStoreStaff,
  type AdminStore,
  type StoreStaffRole,
} from '@/lib/admin-api';
import { useAccessToken } from '@/lib/use-access-token';

export default function AdminStoreStaffPage() {
  const params = useParams<{ storeId: string }>();
  const token = useAccessToken();
  const storeId = params.storeId;
  const [store, setStore] = useState<AdminStore | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [staffUserId, setStaffUserId] = useState('');
  const [staffRole, setStaffRole] = useState<StoreStaffRole>('STORE_STAFF');

  const load = useCallback(async () => {
    if (!token || !storeId) return;
    try {
      const data = await getAdminStore(token, storeId);
      setStore(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load staff.');
    }
  }, [token, storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(action: () => Promise<AdminStore>, ok: string) {
    if (!token || pending) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await action();
      setStore(updated);
      setMessage(ok);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Action failed.');
    } finally {
      setPending(false);
    }
  }

  async function onAddStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !storeId || !staffUserId.trim()) return;
    await runAction(
      () => addStoreStaff(token, storeId, staffUserId.trim(), staffRole),
      'Staff added.',
    );
    setStaffUserId('');
  }

  if (!store && !error) {
    return <p className="text-sm text-muted-foreground">Loading staff…</p>;
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      <section className="space-y-3 border border-border bg-background p-4">
        <h2 className="text-sm font-medium">Staff</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="px-2 py-1 font-medium">User</th>
                <th className="px-2 py-1 font-medium">Role</th>
                <th className="px-2 py-1 font-medium">Added</th>
                <th className="px-2 py-1 font-medium" />
              </tr>
            </thead>
            <tbody>
              {!store || store.staff.length === 0 ? (
                <tr>
                  <td className="px-2 py-3 text-muted-foreground" colSpan={4}>
                    No staff.
                  </td>
                </tr>
              ) : (
                store.staff.map((member) => (
                  <tr key={`${member.userId}-${member.role}`} className="border-b border-border">
                    <td className="px-2 py-1 font-mono text-xs">{member.userId}</td>
                    <td className="px-2 py-1">{member.role}</td>
                    <td className="px-2 py-1 text-muted-foreground">{member.addedAt}</td>
                    <td className="px-2 py-1 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() =>
                          void runAction(
                            () => removeStoreStaff(token!, storeId, member.userId),
                            'Staff removed.',
                          )
                        }
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <form onSubmit={(e) => void onAddStaff(e)} className="flex flex-wrap items-end gap-2">
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">User ID</span>
            <input
              className="block w-64 border border-border bg-background px-3 py-2"
              value={staffUserId}
              onChange={(e) => setStaffUserId(e.target.value)}
              required
              placeholder="UUID"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Role</span>
            <select
              className="block border border-border bg-background px-3 py-2"
              value={staffRole}
              onChange={(e) => setStaffRole(e.target.value as StoreStaffRole)}
            >
              <option value="STORE_STAFF">STORE_STAFF</option>
              <option value="STORE_MANAGER">STORE_MANAGER</option>
            </select>
          </label>
          <Button type="submit" size="sm" disabled={pending}>
            Add staff
          </Button>
        </form>
      </section>
    </div>
  );
}
