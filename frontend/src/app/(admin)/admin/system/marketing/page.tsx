'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { Button } from '@/components/ui/button';
import { apiRequest, ApiClientError } from '@/lib/api-client';
import { getAccessToken } from '@/lib/auth-session';

type MarketingSettings = {
  schemaVersion: 1;
  gtmContainerId: string | null;
  ga4MeasurementId: string | null;
  ga4MpApiSecret: string | null;
  metaPixelId: string | null;
  metaCapiToken: string | null;
  enabled: boolean;
};

type EffectiveResponse = {
  key: string;
  value: MarketingSettings;
};

export default function AdminMarketingSettingsPage() {
  const [value, setValue] = useState<MarketingSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = getAccessToken();
        const res = await apiRequest<EffectiveResponse>(
          '/admin/settings/effective?key=marketing&scopeKind=platform',
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          },
        );
        if (!cancelled) {
          setValue(res.value);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : 'Could not load marketing settings. Use PATCH /admin/settings with key=marketing.',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!value || pending) {
      return;
    }
    const form = new FormData(event.currentTarget);
    setPending(true);
    setSaved(null);
    setError(null);
    try {
      const token = getAccessToken();
      const payload: MarketingSettings = {
        schemaVersion: 1,
        enabled: form.get('enabled') === 'on',
        gtmContainerId: String(form.get('gtmContainerId') || '').trim() || null,
        ga4MeasurementId: String(form.get('ga4MeasurementId') || '').trim() || null,
        ga4MpApiSecret: String(form.get('ga4MpApiSecret') || '').trim() || value.ga4MpApiSecret,
        metaPixelId: String(form.get('metaPixelId') || '').trim() || null,
        metaCapiToken: String(form.get('metaCapiToken') || '').trim() || value.metaCapiToken,
      };
      await apiRequest('/admin/settings', {
        method: 'PATCH',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: {
          key: 'marketing',
          scopeKind: 'platform',
          payload,
        },
      });
      setValue(payload);
      setSaved('Saved platform marketing settings.');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Save failed.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Marketing"
        description="Platform settings key marketing — GTM/GA4/Meta IDs. Secrets stay server-only and are never returned by GET /public/marketing/config."
      />
      <p className="text-sm text-muted-foreground">
        Public config: <code className="text-xs">GET /public/marketing/config</code>. Admin API:{' '}
        <code className="text-xs">PATCH /admin/settings</code> with{' '}
        <code className="text-xs">key=marketing</code>.{' '}
        <Link href="/admin/system/health" className="underline">
          System health
        </Link>
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {saved ? <p className="text-sm text-muted-foreground">{saved}</p> : null}
      {!value ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <form
          onSubmit={(e) => void onSubmit(e)}
          className="max-w-xl space-y-4 border border-border p-4"
        >
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="enabled" defaultChecked={value.enabled} />
            Enabled
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">GTM container ID</span>
            <input
              name="gtmContainerId"
              defaultValue={value.gtmContainerId ?? ''}
              className="h-10 rounded-md border border-border bg-background px-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">GA4 measurement ID</span>
            <input
              name="ga4MeasurementId"
              defaultValue={value.ga4MeasurementId ?? ''}
              className="h-10 rounded-md border border-border bg-background px-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">GA4 MP API secret (server)</span>
            <input
              name="ga4MpApiSecret"
              type="password"
              placeholder={value.ga4MpApiSecret ? '••••••••' : ''}
              className="h-10 rounded-md border border-border bg-background px-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Meta Pixel ID</span>
            <input
              name="metaPixelId"
              defaultValue={value.metaPixelId ?? ''}
              className="h-10 rounded-md border border-border bg-background px-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Meta CAPI token (server)</span>
            <input
              name="metaCapiToken"
              type="password"
              placeholder={value.metaCapiToken ? '••••••••' : ''}
              className="h-10 rounded-md border border-border bg-background px-3"
            />
          </label>
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save'}
          </Button>
        </form>
      )}
    </div>
  );
}
