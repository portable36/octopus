'use client';

import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import {
  activateStore,
  archiveStore,
  getAdminStore,
  maintenanceStore,
  suspendStore,
  type AdminStore,
} from '@/lib/admin-api';
import { cn } from '@/lib/cn';
import { useAccessToken } from '@/lib/use-access-token';

const TABS = [
  { href: 'overview', label: 'Overview' },
  { href: 'catalog', label: 'Catalog' },
  { href: 'inventory', label: 'Inventory' },
  { href: 'orders', label: 'Orders' },
  { href: 'pos', label: 'POS' },
  { href: 'provisioning', label: 'Provisioning' },
  { href: 'settings', label: 'Settings' },
  { href: 'staff', label: 'Staff' },
  { href: 'activity', label: 'Activity' },
] as const;

export default function AdminStoreLayout({ children }: { readonly children: ReactNode }) {
  const params = useParams<{ storeId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const token = useAccessToken();
  const storeId = params.storeId;

  const [store, setStore] = useState<AdminStore | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [dialog, setDialog] = useState<'suspend' | 'maintenance' | null>(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    if (!token || !storeId) return;
    try {
      const data = await getAdminStore(token, storeId);
      setStore(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load store.');
      setStore(null);
    }
  }, [token, storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runLifecycle(action: () => Promise<AdminStore>, ok: string) {
    if (!token || pending) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await action();
      setStore(updated);
      setMessage(ok);
      setDialog(null);
      setReason('');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Action failed.');
    } finally {
      setPending(false);
    }
  }

  const base = `/admin/stores/${storeId}`;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          <Link href="/admin/stores" className="underline underline-offset-2">
            ← All Stores
          </Link>
        </p>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {store?.profile.displayName ?? 'Store'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {store ? (
                <>
                  <span className="font-mono text-xs">{store.storeCode ?? store.id}</span>
                  {' · '}
                  {store.status}
                  {' · '}
                  <Link
                    href={`/admin/vendors/${store.vendorId}`}
                    className="underline underline-offset-2"
                  >
                    Vendor
                  </Link>
                </>
              ) : (
                'Loading store…'
              )}
            </p>
          </div>
          {store ? (
            <div className="flex flex-wrap gap-2">
              {(store.status === 'suspended' ||
                store.status === 'maintenance' ||
                store.status === 'draft') && (
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    void runLifecycle(() => activateStore(token!, storeId), 'Store activated.')
                  }
                >
                  Activate
                </Button>
              )}
              {store.status === 'active' ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => setDialog('suspend')}
                  >
                    Suspend
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => setDialog('maintenance')}
                  >
                    Maintenance
                  </Button>
                </>
              ) : null}
              {store.status !== 'archived' && store.status !== 'closed' ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    void runLifecycle(() => archiveStore(token!, storeId), 'Store archived.')
                  }
                >
                  Archive
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      {dialog ? (
        <div className="space-y-3 border border-border bg-background p-4">
          <h2 className="text-sm font-medium">
            {dialog === 'suspend' ? 'Suspend store' : 'Put store in maintenance'}
          </h2>
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Reason (optional)</span>
            <input
              className="w-full max-w-xl border border-border bg-background px-3 py-2"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason…"
            />
          </label>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() =>
                void runLifecycle(
                  () =>
                    dialog === 'suspend'
                      ? suspendStore(
                          token!,
                          storeId,
                          reason.trim() !== '' ? reason.trim() : undefined,
                        )
                      : maintenanceStore(
                          token!,
                          storeId,
                          reason.trim() !== '' ? reason.trim() : undefined,
                        ),
                  dialog === 'suspend' ? 'Store suspended.' : 'Maintenance enabled.',
                )
              }
            >
              Confirm
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setDialog(null);
                setReason('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <nav
        className="flex flex-wrap gap-1 border-b border-border pb-px"
        aria-label="Store sections"
      >
        {TABS.map((tab) => {
          const href = `${base}/${tab.href}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={tab.href}
              href={href}
              className={cn(
                'px-3 py-2 text-sm',
                active
                  ? 'border-b-2 border-primary font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
