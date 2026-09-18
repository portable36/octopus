'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import {
  formatVendorMoney,
  listPathaoQuoteCities,
  listPathaoQuoteZones,
  listVendorCourierAccounts,
  quoteCourierDelivery,
  upsertVendorCourierAccount,
  type CourierAccountStatus,
  type CourierDeliveryQuote,
  type CourierQuoteCity,
  type CourierQuoteZone,
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

  const [cities, setCities] = useState<CourierQuoteCity[]>([]);
  const [zones, setZones] = useState<CourierQuoteZone[]>([]);
  const [cityId, setCityId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [weightKg, setWeightKg] = useState('0.5');
  const [deliveryType, setDeliveryType] = useState('48');
  const [quote, setQuote] = useState<CourierDeliveryQuote | null>(null);
  const [quotePending, setQuotePending] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

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
          setError(
            err instanceof ApiClientError ? err.message : 'Failed to load courier accounts.',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await listPathaoQuoteCities(vendorId);
        if (!cancelled) {
          setCities(list);
          setQuoteError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setCities([]);
          setQuoteError(
            err instanceof ApiClientError
              ? err.message
              : 'Pathao cities unavailable (configure credentials first).',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  useEffect(() => {
    const id = Number.parseInt(cityId, 10);
    if (!Number.isFinite(id) || id < 1) {
      setZones([]);
      setZoneId('');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const list = await listPathaoQuoteZones(vendorId, id);
        if (!cancelled) {
          setZones(list);
          setZoneId('');
          setQuoteError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setZones([]);
          setQuoteError(err instanceof ApiClientError ? err.message : 'Failed to load zones.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vendorId, cityId]);

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

  async function onQuote(event: FormEvent) {
    event.preventDefault();
    const recipientCityId = Number.parseInt(cityId, 10);
    const recipientZoneId = Number.parseInt(zoneId, 10);
    const weight = Number.parseFloat(weightKg);
    if (!Number.isFinite(recipientCityId) || !Number.isFinite(recipientZoneId)) {
      setQuoteError('Select a city and zone.');
      return;
    }
    if (!Number.isFinite(weight) || weight < 0.5 || weight > 10) {
      setQuoteError('Weight must be between 0.5 and 10 kg.');
      return;
    }
    setQuotePending(true);
    setQuoteError(null);
    setQuote(null);
    try {
      const result = await quoteCourierDelivery(vendorId, {
        provider: 'PATHAO',
        weightKg: weight,
        recipientCityId,
        recipientZoneId,
        deliveryType: Number.parseInt(deliveryType, 10) || 48,
        itemType: 2,
      });
      setQuote(result);
    } catch (err) {
      setQuoteError(err instanceof ApiClientError ? err.message : 'Quote failed.');
    } finally {
      setQuotePending(false);
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

      <section className="max-w-xl space-y-3 rounded-md border border-border bg-background p-4">
        <h2 className="text-sm font-semibold">Pathao delivery fee quote</h2>
        <p className="text-xs text-muted-foreground">
          Uses Pathao merchant price-plan. Steadfast has no public rate API — configure Pathao
          credentials first.
        </p>
        {quoteError ? (
          <p className="text-sm text-destructive" role="alert">
            {quoteError}
          </p>
        ) : null}
        <form className="space-y-3" onSubmit={(e) => void onQuote(e)}>
          <label className="block text-sm">
            City
            <select
              className={fieldClass}
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
              required
            >
              <option value="">Select city</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Zone
            <select
              className={fieldClass}
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              required
              disabled={zones.length === 0}
            >
              <option value="">Select zone</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Weight (kg)
            <input
              className={fieldClass}
              type="number"
              min={0.5}
              max={10}
              step={0.1}
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            Delivery type
            <select
              className={fieldClass}
              value={deliveryType}
              onChange={(e) => setDeliveryType(e.target.value)}
            >
              <option value="48">Normal (48)</option>
              <option value="12">On-demand (12)</option>
            </select>
          </label>
          <Button type="submit" size="sm" disabled={quotePending}>
            {quotePending ? 'Quoting…' : 'Get Pathao quote'}
          </Button>
        </form>
        {quote ? (
          <p className="text-sm" role="status">
            Final fee{' '}
            <span className="font-semibold tabular-nums">
              {formatVendorMoney(quote.finalPriceMinor, quote.currencyCode)}
            </span>
            {quote.discountMinor > 0
              ? ` (list ${formatVendorMoney(quote.priceMinor, quote.currencyCode)}, discount ${formatVendorMoney(quote.discountMinor, quote.currencyCode)})`
              : ''}
          </p>
        ) : null}
      </section>
    </div>
  );
}
