'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import {
  listVendorCourierAccounts,
  upsertVendorCourierAccount,
  type CourierAccountStatus,
} from '@/lib/vendor-api';

const fieldClass =
  'mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function VendorCourierPage() {
  const params = useParams<{ vendorId: string }>();
  const vendorId = params.vendorId;
  const [rows, setRows] = useState<CourierAccountStatus[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [provider, setProvider] = useState<'STEADFAST' | 'PATHAO'>('STEADFAST');
  const [credentialsJson, setCredentialsJson] = useState(
    '{\n  "apiKey": "",\n  "secretKey": ""\n}',
  );
  const [pathaoStoreId, setPathaoStoreId] = useState('');

  async function reload() {
    const data = await listVendorCourierAccounts(vendorId);
    setRows(data);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await reload();
        if (!cancelled) setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load courier accounts.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on vendor change only
  }, [vendorId]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const credentials = JSON.parse(credentialsJson) as Record<string, unknown>;
      await upsertVendorCourierAccount(vendorId, {
        provider,
        credentials,
        ...(provider === 'PATHAO' && pathaoStoreId.trim()
          ? { pathaoStoreId: Number(pathaoStoreId) }
          : {}),
      });
      setMessage(`${provider} credentials saved (encrypted at rest).`);
      await reload();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : err instanceof SyntaxError
            ? 'Credentials must be valid JSON.'
            : 'Save failed.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Courier accounts</h1>
        <p className="text-sm text-muted-foreground">
          Configure Steadfast / Pathao credentials for this vendor. Secrets are never returned after
          save.
        </p>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-md border border-border bg-background">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Provider</th>
              <th className="px-3 py-2 font-medium">Configured</th>
              <th className="px-3 py-2 font-medium">Active</th>
              <th className="px-3 py-2 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.provider} className="border-b border-border last:border-0">
                <td className="px-3 py-2">{row.provider}</td>
                <td className="px-3 py-2">{row.configured ? 'Yes' : 'No'}</td>
                <td className="px-3 py-2">{row.isActive ? 'Yes' : 'No'}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {row.updatedAt ? new Date(row.updatedAt).toLocaleString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={(e) => void onSubmit(e)} className="max-w-xl space-y-3">
        <h2 className="text-sm font-medium">Upsert credentials</h2>
        <label className="block text-sm">
          Provider
          <select
            className={fieldClass}
            value={provider}
            onChange={(e) => {
              const next = e.target.value as 'STEADFAST' | 'PATHAO';
              setProvider(next);
              setCredentialsJson(
                next === 'STEADFAST'
                  ? '{\n  "apiKey": "",\n  "secretKey": ""\n}'
                  : '{\n  "clientId": "",\n  "clientSecret": "",\n  "username": "",\n  "password": "",\n  "pathaoStoreId": 1\n}',
              );
            }}
          >
            <option value="STEADFAST">STEADFAST</option>
            <option value="PATHAO">PATHAO</option>
          </select>
        </label>
        {provider === 'PATHAO' ? (
          <label className="block text-sm">
            Pathao store id (optional override)
            <input
              className={fieldClass}
              type="number"
              min={1}
              value={pathaoStoreId}
              onChange={(e) => setPathaoStoreId(e.target.value)}
            />
          </label>
        ) : null}
        <label className="block text-sm">
          Credentials JSON
          <textarea
            className={`${fieldClass} min-h-36 font-mono text-xs`}
            value={credentialsJson}
            onChange={(e) => setCredentialsJson(e.target.value)}
            required
          />
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save encrypted credentials'}
        </Button>
      </form>
    </div>
  );
}
