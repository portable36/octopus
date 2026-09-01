'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useAccessToken } from '@/lib/use-access-token';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { ApiClientError } from '@/lib/api-client';
import {
  createAdminVendor,
  listAdminUsers,
  listAdminVendors,
  type AdminUserRow,
  type AdminVendor,
} from '@/lib/admin-api';
import { Button } from '@/components/ui/button';

export default function AdminVendorsPage() {
  const token = useAccessToken();
  const [rows, setRows] = useState<AdminVendor[]>([]);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [ownerUserId, setOwnerUserId] = useState('');

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('Authentication token required.');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [data, userRows] = await Promise.all([
          listAdminVendors(token),
          listAdminUsers(token),
        ]);
        if (!cancelled) {
          setRows(data);
          setUsers(userRows);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load vendors.');
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

  async function onCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!token || pending) {
      return;
    }
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const created = await createAdminVendor(token, {
        ownerUserId,
        displayName: String(form.get('displayName') || '').trim(),
        legalName: String(form.get('legalName') || '').trim(),
        contactEmail: String(form.get('contactEmail') || '').trim(),
      });
      setRows((current) => [created, ...current]);
      event.currentTarget.reset();
      setOwnerUserId('');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to create vendor.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Vendors"
        description="Platform vendor list and lifecycle ops over existing Vendor handlers."
      />
      <form
        onSubmit={(event) => void onCreate(event)}
        className="max-w-2xl space-y-4 border border-border bg-background p-4"
      >
        <div>
          <h2 className="font-medium">Create vendor for a user</h2>
          <p className="text-sm text-muted-foreground">
            The vendor starts in pending status and still requires review and activation.
          </p>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Owner user</span>
          <select
            name="ownerUserId"
            value={ownerUserId}
            onChange={(event) => {
              setOwnerUserId(event.target.value);
              const selected = users.find((user) => user.id === event.target.value);
              const emailInput = event.currentTarget.form?.elements.namedItem('contactEmail');
              if (emailInput instanceof HTMLInputElement && selected) {
                emailInput.value = selected.email;
              }
            }}
            className="h-10 border border-border bg-background px-3"
            required
          >
            <option value="">Select a user</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} — {user.email}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Display name</span>
            <input
              name="displayName"
              minLength={2}
              maxLength={160}
              required
              className="h-10 border border-border bg-background px-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Legal name</span>
            <input
              name="legalName"
              minLength={2}
              maxLength={200}
              required
              className="h-10 border border-border bg-background px-3"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Business contact email</span>
          <input
            name="contactEmail"
            type="email"
            required
            className="h-10 border border-border bg-background px-3"
          />
        </label>
        <Button type="submit" disabled={pending || loading || users.length === 0}>
          {pending ? 'Creating…' : 'Create pending vendor'}
        </Button>
      </form>
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
                <th className="px-3 py-2 font-medium">Email</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-muted-foreground" colSpan={4}>
                    No vendors yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/vendors/${row.id}`}
                        className="underline underline-offset-2 hover:text-foreground"
                      >
                        {row.profile.displayName}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{row.profile.slug}</td>
                    <td className="px-3 py-2">{row.status}</td>
                    <td className="px-3 py-2">{row.contact.email}</td>
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
