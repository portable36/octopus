'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import {
  getAdminStore,
  updateStoreSettings,
  type AdminCommerceSettings,
  type AdminStore,
} from '@/lib/admin-api';
import { useAccessToken } from '@/lib/use-access-token';

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

export default function AdminStoreSettingsPage() {
  const params = useParams<{ storeId: string }>();
  const token = useAccessToken();
  const storeId = params.storeId;
  const [store, setStore] = useState<AdminStore | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [codEnabled, setCodEnabled] = useState(false);
  const [codMin, setCodMin] = useState('0');
  const [codMax, setCodMax] = useState('');
  const [codTtl, setCodTtl] = useState('');

  const load = useCallback(async () => {
    if (!token || !storeId) return;
    try {
      const data = await getAdminStore(token, storeId);
      setStore(data);
      syncCodForm(data.settings, { setCodEnabled, setCodMin, setCodMax, setCodTtl });
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load settings.');
    }
  }, [token, storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSaveCod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !storeId || pending) return;
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
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updateStoreSettings(token, storeId, {
        codEnabled,
        codMinAmountMinor: min,
        codMaxAmountMinor: max,
        ...(ttl !== undefined ? { codReservationTtlHours: ttl } : {}),
      });
      setStore(updated);
      syncCodForm(updated.settings, { setCodEnabled, setCodMin, setCodMax, setCodTtl });
      setMessage('COD settings saved.');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to save settings.');
    } finally {
      setPending(false);
    }
  }

  if (!store && !error) {
    return <p className="text-sm text-muted-foreground">Loading settings…</p>;
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      <section className="space-y-3 border border-border bg-background p-4">
        <h2 className="text-sm font-medium">COD settings</h2>
        <p className="text-xs text-muted-foreground">
          Amounts are integer minor units. Checkout requires vendor and store COD both enabled.
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
    </div>
  );
}
