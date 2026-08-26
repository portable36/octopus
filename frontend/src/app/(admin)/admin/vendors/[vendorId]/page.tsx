'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import {
  activateVendor,
  addVendorStaff,
  approveVendor,
  getAdminVendor,
  rejectVendor,
  removeVendorStaff,
  reopenVendor,
  suspendVendor,
  updateVendorSettings,
  type AdminCommerceSettings,
  type AdminVendor,
  type VendorStaffRole,
} from '@/lib/admin-api';

function syncCodForm(
  settings: AdminCommerceSettings | undefined,
  set: {
    setCodEnabled: (v: boolean) => void;
    setCodMin: (v: string) => void;
    setCodMax: (v: string) => void;
    setCodTtl: (v: string) => void;
  },
) {
  set.setCodEnabled(settings?.codEnabled ?? false);
  set.setCodMin(
    settings?.codMinAmountMinor !== undefined ? String(settings.codMinAmountMinor) : '0',
  );
  set.setCodMax(
    settings?.codMaxAmountMinor === null || settings?.codMaxAmountMinor === undefined
      ? ''
      : String(settings.codMaxAmountMinor),
  );
  set.setCodTtl(
    settings?.codReservationTtlHours !== undefined ? String(settings.codReservationTtlHours) : '',
  );
}

export default function AdminVendorDetailPage() {
  const params = useParams<{ vendorId: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const vendorId = params.vendorId;

  const [vendor, setVendor] = useState<AdminVendor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [reason, setReason] = useState('');
  const [staffUserId, setStaffUserId] = useState('');
  const [staffRole, setStaffRole] = useState<VendorStaffRole>('VENDOR_STAFF');
  const [codEnabled, setCodEnabled] = useState(false);
  const [codMin, setCodMin] = useState('0');
  const [codMax, setCodMax] = useState('');
  const [codTtl, setCodTtl] = useState('');

  const applyVendor = useCallback((data: AdminVendor) => {
    setVendor(data);
    syncCodForm(data.settings, { setCodEnabled, setCodMin, setCodMax, setCodTtl });
  }, []);

  const load = useCallback(async () => {
    if (!token || !vendorId) {
      setLoading(false);
      setError('Authentication token required.');
      return;
    }
    setLoading(true);
    try {
      const data = await getAdminVendor(token, vendorId);
      applyVendor(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load vendor.');
      setVendor(null);
    } finally {
      setLoading(false);
    }
  }, [token, vendorId, applyVendor]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(action: () => Promise<AdminVendor>, okMessage: string) {
    if (!token || pending) {
      return;
    }
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await action();
      applyVendor(updated);
      setMessage(okMessage);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Action failed.');
    } finally {
      setPending(false);
    }
  }

  async function onSaveCod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !vendorId) {
      return;
    }
    const min = Number.parseInt(codMin, 10);
    const maxTrimmed = codMax.trim();
    const max = maxTrimmed === '' ? null : Number.parseInt(maxTrimmed, 10);
    const ttlTrimmed = codTtl.trim();
    const ttl = ttlTrimmed === '' ? undefined : Number.parseInt(ttlTrimmed, 10);
    if (!Number.isFinite(min) || min < 0) {
      setError('COD min amount must be a non-negative integer (minor units).');
      return;
    }
    if (max !== null && (!Number.isFinite(max) || max < 0)) {
      setError('COD max amount must be empty or a non-negative integer (minor units).');
      return;
    }
    if (ttl !== undefined && (!Number.isFinite(ttl) || ttl < 1)) {
      setError('COD reservation TTL must be empty or an integer ≥ 1 hour.');
      return;
    }
    await runAction(
      () =>
        updateVendorSettings(token, vendorId, {
          codEnabled,
          codMinAmountMinor: min,
          codMaxAmountMinor: max,
          ...(ttl !== undefined ? { codReservationTtlHours: ttl } : {}),
        }),
      'COD settings saved.',
    );
  }

  async function onAddStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !vendorId || !staffUserId.trim()) {
      return;
    }
    await runAction(
      () => addVendorStaff(token, vendorId, staffUserId.trim(), staffRole),
      'Staff added.',
    );
    setStaffUserId('');
  }

  const backHref = token ? `/admin/vendors?token=${encodeURIComponent(token)}` : '/admin/vendors';

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={vendor?.profile.displayName ?? 'Vendor'}
        description="Approve, reject, activate, suspend, and manage vendor staff."
      />
      <p className="text-sm text-muted-foreground">
        <Link href={backHref} className="underline underline-offset-2">
          ← Vendors
        </Link>
      </p>
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      {vendor ? (
        <>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium">{vendor.status}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Slug</dt>
              <dd>{vendor.profile.slug}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd>{vendor.contact.email}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Owner</dt>
              <dd className="font-mono text-xs">{vendor.ownerUserId}</dd>
            </div>
            {vendor.rejectionReason ? (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Rejection reason</dt>
                <dd>{vendor.rejectionReason}</dd>
              </div>
            ) : null}
          </dl>

          <section className="space-y-3 border border-border p-4">
            <h2 className="text-sm font-medium">Lifecycle</h2>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">
                Reason (reject required; suspend optional)
              </span>
              <input
                className="w-full max-w-xl border border-border bg-background px-3 py-2"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason…"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() =>
                  void runAction(() => approveVendor(token!, vendorId), 'Vendor approved.')
                }
              >
                Approve
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending || reason.trim().length < 3}
                onClick={() =>
                  void runAction(
                    () => rejectVendor(token!, vendorId, reason.trim()),
                    'Vendor rejected.',
                  )
                }
              >
                Reject
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() =>
                  void runAction(() => activateVendor(token!, vendorId), 'Vendor activated.')
                }
              >
                Activate
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  void runAction(
                    () =>
                      suspendVendor(
                        token!,
                        vendorId,
                        reason.trim() !== '' ? reason.trim() : undefined,
                      ),
                    'Vendor suspended.',
                  )
                }
              >
                Suspend
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() =>
                  void runAction(() => reopenVendor(token!, vendorId), 'Vendor reopened.')
                }
              >
                Reopen
              </Button>
            </div>
          </section>

          <section className="space-y-3 border border-border p-4">
            <h2 className="text-sm font-medium">COD settings</h2>
            <p className="text-xs text-muted-foreground">
              Amounts are integer minor units (e.g. poisha). Checkout requires vendor and store COD
              both enabled. PATCH <code className="text-[11px]">/vendors/:id/settings</code>.
            </p>
            <form onSubmit={(e) => void onSaveCod(e)} className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={codEnabled}
                  onChange={(e) => setCodEnabled(e.target.checked)}
                />
                COD enabled
              </label>
              <div className="flex flex-wrap gap-3">
                <label className="space-y-1 text-sm">
                  <span className="text-muted-foreground">Min amount (minor)</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className="block w-40 border border-border bg-background px-3 py-2"
                    value={codMin}
                    onChange={(e) => setCodMin(e.target.value)}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-muted-foreground">Max amount (minor, empty = none)</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className="block w-40 border border-border bg-background px-3 py-2"
                    value={codMax}
                    onChange={(e) => setCodMax(e.target.value)}
                    placeholder="No max"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-muted-foreground">Reservation TTL (hours)</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    className="block w-40 border border-border bg-background px-3 py-2"
                    value={codTtl}
                    onChange={(e) => setCodTtl(e.target.value)}
                    placeholder="Keep current"
                  />
                </label>
              </div>
              <Button type="submit" size="sm" disabled={pending}>
                Save COD settings
              </Button>
            </form>
          </section>

          <section className="space-y-3 border border-border p-4">
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
                  {vendor.staff.length === 0 ? (
                    <tr>
                      <td className="px-2 py-3 text-muted-foreground" colSpan={4}>
                        No staff.
                      </td>
                    </tr>
                  ) : (
                    vendor.staff.map((member) => (
                      <tr
                        key={`${member.userId}-${member.role}`}
                        className="border-b border-border"
                      >
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
                                () => removeVendorStaff(token!, vendorId, member.userId),
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
                  onChange={(e) => setStaffRole(e.target.value as VendorStaffRole)}
                >
                  <option value="VENDOR_STAFF">VENDOR_STAFF</option>
                  <option value="VENDOR_OWNER">VENDOR_OWNER</option>
                </select>
              </label>
              <Button type="submit" size="sm" disabled={pending}>
                Add staff
              </Button>
            </form>
          </section>
        </>
      ) : null}
    </div>
  );
}
