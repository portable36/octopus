'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { Button } from '@/components/ui/button';
import { apiRequest, ApiClientError } from '@/lib/api-client';

type GeneralSettings = {
  schemaVersion: 1;
  supportEmail: string | null;
  defaultLocale: string;
  defaultCurrencyCode: string;
};

type BrandingSettings = {
  schemaVersion: 1;
  siteName: string | null;
  tagline: string | null;
  primaryColor: string | null;
  logoMediaId: string | null;
  faviconMediaId: string | null;
};

type EffectiveResponse<T> = {
  key: string;
  value: T;
};

export default function AdminWebsiteSettingsPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [general, setGeneral] = useState<GeneralSettings | null>(null);
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, setPending] = useState<'general' | 'branding' | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Pass ?token=<accessToken> to load website settings.');
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [generalRes, brandingRes] = await Promise.all([
          apiRequest<EffectiveResponse<GeneralSettings>>(
            '/admin/settings/effective?key=general&scopeKind=platform',
            { headers },
          ),
          apiRequest<EffectiveResponse<BrandingSettings>>(
            '/admin/settings/effective?key=branding&scopeKind=platform',
            { headers },
          ),
        ]);
        if (!cancelled) {
          setGeneral(generalRes.value);
          setBranding(brandingRes.value);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : 'Could not load platform general/branding settings.',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSaveGeneral(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !general || pending) {
      return;
    }
    const form = new FormData(event.currentTarget);
    setPending('general');
    setSaved(null);
    setError(null);
    try {
      const payload: GeneralSettings = {
        schemaVersion: 1,
        supportEmail: String(form.get('supportEmail') || '').trim() || null,
        defaultLocale: String(form.get('defaultLocale') || '').trim() || 'en',
        defaultCurrencyCode: String(form.get('defaultCurrencyCode') || '').trim() || 'BDT',
      };
      await apiRequest('/admin/settings', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: { key: 'general', scopeKind: 'platform', payload },
      });
      setGeneral(payload);
      setSaved('Saved platform general settings.');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Save failed.');
    } finally {
      setPending(null);
    }
  }

  async function onSaveBranding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !branding || pending) {
      return;
    }
    const form = new FormData(event.currentTarget);
    setPending('branding');
    setSaved(null);
    setError(null);
    try {
      const payload: BrandingSettings = {
        schemaVersion: 1,
        siteName: String(form.get('siteName') || '').trim() || null,
        tagline: String(form.get('tagline') || '').trim() || null,
        primaryColor: String(form.get('primaryColor') || '').trim() || null,
        logoMediaId: String(form.get('logoMediaId') || '').trim() || null,
        faviconMediaId: String(form.get('faviconMediaId') || '').trim() || null,
      };
      await apiRequest('/admin/settings', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: { key: 'branding', scopeKind: 'platform', payload },
      });
      setBranding(payload);
      setSaved('Saved platform branding settings.');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Save failed.');
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Website"
        description="Platform general + branding via Settings. CMS page builder, menus, and draft→publish remain deferred."
      />
      <p className="text-sm text-muted-foreground">
        Public config: <code className="text-xs">GET /storefront/config</code>. Admin:{' '}
        <code className="text-xs">GET/PATCH /admin/settings</code> with{' '}
        <code className="text-xs">key=general|branding</code>.
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {saved ? <p className="text-sm text-muted-foreground">{saved}</p> : null}
      {!general || !branding ? (
        <p className="text-sm text-muted-foreground">{token ? 'Loading…' : null}</p>
      ) : (
        <div className="grid max-w-3xl gap-6 md:grid-cols-2">
          <form
            onSubmit={(e) => void onSaveGeneral(e)}
            className="space-y-4 border border-border p-4"
          >
            <h2 className="text-sm font-medium">General</h2>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Support email</span>
              <input
                name="supportEmail"
                type="email"
                defaultValue={general.supportEmail ?? ''}
                className="h-10 rounded-md border border-border bg-background px-3"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Default locale</span>
              <input
                name="defaultLocale"
                defaultValue={general.defaultLocale}
                className="h-10 rounded-md border border-border bg-background px-3"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Default currency</span>
              <input
                name="defaultCurrencyCode"
                defaultValue={general.defaultCurrencyCode}
                className="h-10 rounded-md border border-border bg-background px-3"
              />
            </label>
            <Button type="submit" disabled={pending !== null}>
              {pending === 'general' ? 'Saving…' : 'Save general'}
            </Button>
          </form>
          <form
            onSubmit={(e) => void onSaveBranding(e)}
            className="space-y-4 border border-border p-4"
          >
            <h2 className="text-sm font-medium">Branding</h2>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Site name</span>
              <input
                name="siteName"
                defaultValue={branding.siteName ?? ''}
                className="h-10 rounded-md border border-border bg-background px-3"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Tagline</span>
              <input
                name="tagline"
                defaultValue={branding.tagline ?? ''}
                className="h-10 rounded-md border border-border bg-background px-3"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Primary color</span>
              <input
                name="primaryColor"
                placeholder="#0f172a"
                defaultValue={branding.primaryColor ?? ''}
                className="h-10 rounded-md border border-border bg-background px-3"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Logo media ID</span>
              <input
                name="logoMediaId"
                defaultValue={branding.logoMediaId ?? ''}
                className="h-10 rounded-md border border-border bg-background px-3"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Favicon media ID</span>
              <input
                name="faviconMediaId"
                defaultValue={branding.faviconMediaId ?? ''}
                className="h-10 rounded-md border border-border bg-background px-3"
              />
            </label>
            <Button type="submit" disabled={pending !== null}>
              {pending === 'branding' ? 'Saving…' : 'Save branding'}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
