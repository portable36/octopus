'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

      <Card className="max-w-xl space-y-3">
        <div>
          <CardTitle>Store branding</CardTitle>
          <CardDescription>
            Store-scoped Settings document. Empty fields fall back to vendor, then platform
            storefront config.
          </CardDescription>
        </div>
        <form onSubmit={(e) => void onSave(e)} className="space-y-3">
          <Label htmlFor="store-branding-siteName">
            Display / site name
            <Input
              id="store-branding-siteName"
              name="siteName"
              value={branding.siteName ?? ''}
              onChange={(e) => setBranding((prev) => ({ ...prev, siteName: e.target.value }))}
            />
          </Label>
          <Label htmlFor="store-branding-tagline">
            Tagline
            <Input
              id="store-branding-tagline"
              name="tagline"
              value={branding.tagline ?? ''}
              onChange={(e) => setBranding((prev) => ({ ...prev, tagline: e.target.value }))}
            />
          </Label>
          <Label>
            Primary accent color
            <div className="flex items-center gap-2">
              <Input
                type="color"
                aria-label="Primary accent color picker"
                value={colorInputValue(branding.primaryColor, '#fcca19')}
                onChange={(e) => setBranding((prev) => ({ ...prev, primaryColor: e.target.value }))}
                className="h-10 w-12 cursor-pointer p-0.5"
              />
              <Input
                id="store-branding-primaryColor"
                name="primaryColor"
                value={branding.primaryColor ?? ''}
                onChange={(e) => setBranding((prev) => ({ ...prev, primaryColor: e.target.value }))}
                onBlur={(e) => {
                  const normalized = normalizeCssHexColor(e.target.value);
                  if (normalized) {
                    setBranding((prev) => ({ ...prev, primaryColor: normalized }));
                  }
                }}
                placeholder="#fcca19"
                className="flex-1 font-mono text-xs"
              />
            </div>
          </Label>
          <Label htmlFor="store-branding-logoMediaId">
            Logo media ID
            <Input
              id="store-branding-logoMediaId"
              name="logoMediaId"
              value={branding.logoMediaId ?? ''}
              onChange={(e) => setBranding((prev) => ({ ...prev, logoMediaId: e.target.value }))}
              className="font-mono text-xs"
              placeholder="UUID from Media upload"
            />
          </Label>
          <Label htmlFor="store-branding-faviconMediaId">
            Favicon media ID
            <Input
              id="store-branding-faviconMediaId"
              name="faviconMediaId"
              value={branding.faviconMediaId ?? ''}
              onChange={(e) => setBranding((prev) => ({ ...prev, faviconMediaId: e.target.value }))}
              className="font-mono text-xs"
            />
          </Label>
          <Button type="submit" size="sm" disabled={pending || !store}>
            {pending ? 'Saving…' : 'Save branding'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
