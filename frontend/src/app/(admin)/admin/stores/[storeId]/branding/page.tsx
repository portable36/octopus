'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ApiClientError, apiRequest } from '@/lib/api-client';
import { getAdminStore, type AdminStore } from '@/lib/admin-api';
import { colorInputValue, normalizeCssHexColor } from '@/lib/css-hex-color';
import { useAccessToken } from '@/lib/use-access-token';

type BrandingSettings = {
  schemaVersion: 1;
  siteName: string | null;
  tagline: string | null;
  primaryColor: string | null;
  logoMediaId: string | null;
  faviconMediaId: string | null;
};

type EffectiveResponse = { key: string; value: BrandingSettings };

const EMPTY: BrandingSettings = {
  schemaVersion: 1,
  siteName: null,
  tagline: null,
  primaryColor: null,
  logoMediaId: null,
  faviconMediaId: null,
};

export default function AdminStoreBrandingPage() {
  const params = useParams<{ storeId: string }>();
  const token = useAccessToken();
  const storeId = params.storeId;
  const [store, setStore] = useState<AdminStore | null>(null);
  const [branding, setBranding] = useState<BrandingSettings>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    if (!token || !storeId) return;
    try {
      const storeData = await getAdminStore(token, storeId);
      setStore(storeData);
      const qs = new URLSearchParams({
        key: 'branding',
        scopeKind: 'store',
        vendorId: storeData.vendorId,
        storeId,
      });
      const effective = await apiRequest<EffectiveResponse>(
        `/admin/settings/effective?${qs.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setBranding({ ...EMPTY, ...effective.value, schemaVersion: 1 });
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load store branding.');
    }
  }, [token, storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !store || pending) return;
    const rawPrimary = branding.primaryColor?.trim() ?? '';
    const primaryColor = rawPrimary ? normalizeCssHexColor(rawPrimary) : null;
    if (rawPrimary && !primaryColor) {
      setError('Primary color must be a hex value like #fcca19.');
      return;
    }
    const payload: BrandingSettings = {
      schemaVersion: 1,
      siteName: branding.siteName?.trim() || null,
      tagline: branding.tagline?.trim() || null,
      primaryColor,
      logoMediaId: branding.logoMediaId?.trim() || null,
      faviconMediaId: branding.faviconMediaId?.trim() || null,
    };
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      await apiRequest('/admin/settings', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: {
          key: 'branding',
          scopeKind: 'store',
          vendorId: store.vendorId,
          storeId: store.id,
          payload,
        },
      });
      setBranding(payload);
      setMessage('Store branding saved (inherits from vendor/platform when fields are empty).');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to save branding.');
    } finally {
      setPending(false);
    }
  }

  if (!store && !error) {
    return <p className="text-sm text-muted-foreground">Loading branding…</p>;
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      <section className="space-y-3 border border-border bg-background p-4">
        <div>
          <h2 className="text-sm font-medium">Store branding</h2>
          <p className="text-xs text-muted-foreground">
            Store-scoped Settings document. Empty fields fall back to vendor, then platform
            storefront config.
          </p>
        </div>
        <form onSubmit={(e) => void onSave(e)} className="space-y-3 max-w-xl">
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-foreground">Display / site name</span>
            <input
              id="store-branding-siteName"
              name="siteName"
              value={branding.siteName ?? ''}
              onChange={(e) => setBranding((prev) => ({ ...prev, siteName: e.target.value }))}
              className="h-9 rounded-md border border-border bg-background px-3 text-xs"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-foreground">Tagline</span>
            <input
              id="store-branding-tagline"
              name="tagline"
              value={branding.tagline ?? ''}
              onChange={(e) => setBranding((prev) => ({ ...prev, tagline: e.target.value }))}
              className="h-9 rounded-md border border-border bg-background px-3 text-xs"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-foreground">Primary accent color</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label="Primary accent color picker"
                value={colorInputValue(branding.primaryColor, '#fcca19')}
                onChange={(e) =>
                  setBranding((prev) => ({ ...prev, primaryColor: e.target.value }))
                }
                className="h-9 w-12 cursor-pointer rounded border border-border p-0.5 bg-background"
              />
              <input
                id="store-branding-primaryColor"
                name="primaryColor"
                value={branding.primaryColor ?? ''}
                onChange={(e) =>
                  setBranding((prev) => ({ ...prev, primaryColor: e.target.value }))
                }
                onBlur={(e) => {
                  const normalized = normalizeCssHexColor(e.target.value);
                  if (normalized) {
                    setBranding((prev) => ({ ...prev, primaryColor: normalized }));
                  }
                }}
                placeholder="#fcca19"
                className="h-9 flex-1 rounded-md border border-border bg-background px-3 font-mono text-xs"
              />
            </div>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-foreground">Logo media ID</span>
            <input
              id="store-branding-logoMediaId"
              name="logoMediaId"
              value={branding.logoMediaId ?? ''}
              onChange={(e) => setBranding((prev) => ({ ...prev, logoMediaId: e.target.value }))}
              className="h-9 rounded-md border border-border bg-background px-3 font-mono text-xs"
              placeholder="UUID from Media upload"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-foreground">Favicon media ID</span>
            <input
              id="store-branding-faviconMediaId"
              name="faviconMediaId"
              value={branding.faviconMediaId ?? ''}
              onChange={(e) =>
                setBranding((prev) => ({ ...prev, faviconMediaId: e.target.value }))
              }
              className="h-9 rounded-md border border-border bg-background px-3 font-mono text-xs"
            />
          </label>
          <Button type="submit" size="sm" disabled={pending || !store}>
            {pending ? 'Saving…' : 'Save branding'}
          </Button>
        </form>
      </section>
    </div>
  );
}
