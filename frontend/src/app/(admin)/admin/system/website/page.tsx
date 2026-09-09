'use client';

import { FormEvent, useEffect, useState, type CSSProperties } from 'react';
import { useAccessToken } from '@/lib/use-access-token';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { Button } from '@/components/ui/button';
import { apiRequest, ApiClientError } from '@/lib/api-client';
import { colorInputValue, normalizeCssHexColor } from '@/lib/css-hex-color';
import { DEFAULT_THEME_SETTINGS, type ThemeSettings } from '@/lib/storefront-config-api';

type ThemeColorKey = keyof ThemeSettings['colors'];

function withNormalizedThemeColors(theme: ThemeSettings): ThemeSettings {
  return {
    ...theme,
    colors: {
      primary: normalizeCssHexColor(theme.colors.primary),
      accent: normalizeCssHexColor(theme.colors.accent),
      announcementBg: normalizeCssHexColor(theme.colors.announcementBg),
      announcementText: normalizeCssHexColor(theme.colors.announcementText),
    },
  };
}

type GeneralSettings = {
  schemaVersion: 1;
  supportEmail: string | null;
  defaultLocale: string;
  defaultCurrencyCode: string;
  vendorRegistrationEnabled: boolean;
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
  const token = useAccessToken();
  const [general, setGeneral] = useState<GeneralSettings | null>(null);
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_THEME_SETTINGS);
  const [activeTab, setActiveTab] = useState<
    'theme' | 'banners' | 'header_footer' | 'branding' | 'general'
  >('theme');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, setPending] = useState<'general' | 'branding' | 'theme' | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Sign in required to load website control center.');
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [generalRes, brandingRes, themeRes] = await Promise.allSettled([
          apiRequest<EffectiveResponse<GeneralSettings>>(
            '/admin/settings/effective?key=general&scopeKind=platform',
            { headers },
          ),
          apiRequest<EffectiveResponse<BrandingSettings>>(
            '/admin/settings/effective?key=branding&scopeKind=platform',
            { headers },
          ),
          apiRequest<EffectiveResponse<ThemeSettings>>(
            '/admin/settings/effective?key=theme&scopeKind=platform',
            { headers },
          ),
        ]);

        if (cancelled) return;

        if (generalRes.status === 'fulfilled') {
          setGeneral(generalRes.value.value);
        }
        if (brandingRes.status === 'fulfilled') {
          setBranding(brandingRes.value.value);
        }
        if (themeRes.status === 'fulfilled') {
          setTheme(themeRes.value.value);
        }
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : 'Could not load platform website customization settings.',
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
    if (!token || !general || pending) return;
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
        vendorRegistrationEnabled: general.vendorRegistrationEnabled,
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
    if (!token || !branding || pending) return;
    const form = new FormData(event.currentTarget);
    setPending('branding');
    setSaved(null);
    setError(null);
    try {
      const rawPrimary = String(form.get('primaryColor') || '').trim();
      const primaryColor = rawPrimary ? normalizeCssHexColor(rawPrimary) : null;
      if (rawPrimary && !primaryColor) {
        setError('Primary brand hex color must look like #fcca19.');
        return;
      }
      const payload: BrandingSettings = {
        schemaVersion: 1,
        siteName: String(form.get('siteName') || '').trim() || null,
        tagline: String(form.get('tagline') || '').trim() || null,
        primaryColor,
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

  function setThemeColor(key: ThemeColorKey, raw: string) {
    setTheme((prev) => ({
      ...prev,
      colors: { ...prev.colors, [key]: raw },
    }));
  }

  function commitThemeColor(key: ThemeColorKey, raw: string) {
    const normalized = normalizeCssHexColor(raw);
    setTheme((prev) => ({
      ...prev,
      colors: { ...prev.colors, [key]: normalized ?? (raw.trim() || null) },
    }));
  }

  async function onSaveTheme(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || pending) return;
    const payload = withNormalizedThemeColors(theme);
    if (
      (theme.colors.accent && !payload.colors.accent) ||
      (theme.colors.primary && !payload.colors.primary) ||
      (theme.colors.announcementBg && !payload.colors.announcementBg) ||
      (theme.colors.announcementText && !payload.colors.announcementText)
    ) {
      setError('Use a valid hex color like #fcca19 (3 or 6 digits).');
      return;
    }
    setTheme(payload);
    setPending('theme');
    setSaved(null);
    setError(null);
    try {
      await apiRequest('/admin/settings', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: { key: 'theme', scopeKind: 'platform', payload },
      });
      setSaved('Saved storefront theme customizer & banner slots.');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Save theme failed.');
    } finally {
      setPending(null);
    }
  }

  const siteTitle = branding?.siteName || 'Octopus';

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Website Control Center"
        description="Live storefront theme customizer, banner slots, header/footer configuration, and real-time interactive preview."
      />

      {error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {saved ? (
        <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400">
          {saved}
        </div>
      ) : null}

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('theme')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'theme'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Theme & Colors
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('banners')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'banners'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Banner Slots
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('header_footer')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'header_footer'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Header & Footer
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('branding')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'branding'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Branding & Identity
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'general'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          General Settings
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Customization Controls Form */}
        <div className="lg:col-span-6 space-y-6">
          {activeTab === 'theme' && (
            <form
              onSubmit={(e) => void onSaveTheme(e)}
              className="space-y-6 rounded-lg border border-border bg-card p-5"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    Theme & Announcement Bar
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Adjust storefront branding colors and top notification bar.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTheme(DEFAULT_THEME_SETTINGS)}
                >
                  Reset Defaults
                </Button>
              </div>

              {/* Theme Colors */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Color Palette
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5 text-xs">
                    <span className="font-medium text-foreground">Primary Accent Color</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={colorInputValue(theme.colors.accent, '#2563eb')}
                        onChange={(e) => setThemeColor('accent', e.target.value)}
                        className="h-9 w-12 cursor-pointer rounded border border-border p-0.5 bg-background"
                      />
                      <input
                        type="text"
                        value={theme.colors.accent || ''}
                        onChange={(e) => setThemeColor('accent', e.target.value)}
                        onBlur={(e) => commitThemeColor('accent', e.target.value)}
                        placeholder="#2563eb"
                        className="h-9 flex-1 rounded border border-border bg-background px-2.5 font-mono text-xs"
                      />
                    </div>
                  </label>

                  <label className="flex flex-col gap-1.5 text-xs">
                    <span className="font-medium text-foreground">Brand Background Color</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={colorInputValue(theme.colors.primary, '#0f172a')}
                        onChange={(e) => setThemeColor('primary', e.target.value)}
                        className="h-9 w-12 cursor-pointer rounded border border-border p-0.5 bg-background"
                      />
                      <input
                        type="text"
                        value={theme.colors.primary || ''}
                        onChange={(e) => setThemeColor('primary', e.target.value)}
                        onBlur={(e) => commitThemeColor('primary', e.target.value)}
                        placeholder="#0f172a"
                        className="h-9 flex-1 rounded border border-border bg-background px-2.5 font-mono text-xs"
                      />
                    </div>
                  </label>
                </div>
              </div>

              {/* Announcement Bar Settings */}
              <div className="space-y-4 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Announcement Bar
                  </h3>
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={theme.announcementBar.enabled}
                      onChange={(e) =>
                        setTheme((prev) => ({
                          ...prev,
                          announcementBar: { ...prev.announcementBar, enabled: e.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded border-border"
                    />
                    Enabled
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5 text-xs">
                    <span className="font-medium text-foreground">Bar Background Color</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={colorInputValue(theme.colors.announcementBg, '#1e293b')}
                        onChange={(e) => setThemeColor('announcementBg', e.target.value)}
                        className="h-9 w-12 cursor-pointer rounded border border-border p-0.5 bg-background"
                      />
                      <input
                        type="text"
                        value={theme.colors.announcementBg || ''}
                        onChange={(e) => setThemeColor('announcementBg', e.target.value)}
                        onBlur={(e) => commitThemeColor('announcementBg', e.target.value)}
                        placeholder="#1e293b"
                        className="h-9 flex-1 rounded border border-border bg-background px-2.5 font-mono text-xs"
                      />
                    </div>
                  </label>

                  <label className="flex flex-col gap-1.5 text-xs">
                    <span className="font-medium text-foreground">Bar Text Color</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={colorInputValue(theme.colors.announcementText, '#ffffff')}
                        onChange={(e) => setThemeColor('announcementText', e.target.value)}
                        className="h-9 w-12 cursor-pointer rounded border border-border p-0.5 bg-background"
                      />
                      <input
                        type="text"
                        value={theme.colors.announcementText || ''}
                        onChange={(e) => setThemeColor('announcementText', e.target.value)}
                        onBlur={(e) => commitThemeColor('announcementText', e.target.value)}
                        placeholder="#ffffff"
                        className="h-9 flex-1 rounded border border-border bg-background px-2.5 font-mono text-xs"
                      />
                    </div>
                  </label>
                </div>

                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-medium text-foreground">Announcement Message</span>
                  <input
                    type="text"
                    value={theme.announcementBar.text}
                    onChange={(e) =>
                      setTheme((prev) => ({
                        ...prev,
                        announcementBar: { ...prev.announcementBar, text: e.target.value },
                      }))
                    }
                    className="h-9 rounded border border-border bg-background px-3 text-xs"
                    placeholder="e.g. Free shipping on orders over 1000 BDT!"
                  />
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="font-medium text-foreground">Link Text (Optional)</span>
                    <input
                      type="text"
                      value={theme.announcementBar.linkText || ''}
                      onChange={(e) =>
                        setTheme((prev) => ({
                          ...prev,
                          announcementBar: {
                            ...prev.announcementBar,
                            linkText: e.target.value || null,
                          },
                        }))
                      }
                      className="h-9 rounded border border-border bg-background px-3 text-xs"
                      placeholder="e.g. Track order"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="font-medium text-foreground">Link URL</span>
                    <input
                      type="text"
                      value={theme.announcementBar.linkUrl || ''}
                      onChange={(e) =>
                        setTheme((prev) => ({
                          ...prev,
                          announcementBar: {
                            ...prev.announcementBar,
                            linkUrl: e.target.value || null,
                          },
                        }))
                      }
                      className="h-9 rounded border border-border bg-background px-3 text-xs"
                      placeholder="e.g. /account/orders"
                    />
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={pending !== null}>
                  {pending === 'theme' ? 'Saving…' : 'Save Theme & Colors'}
                </Button>
              </div>
            </form>
          )}

          {activeTab === 'banners' && (
            <form
              onSubmit={(e) => void onSaveTheme(e)}
              className="space-y-6 rounded-lg border border-border bg-card p-5"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Banner Slots</h2>
                  <p className="text-xs text-muted-foreground">
                    Configure storefront home hero and promotional banner strips.
                  </p>
                </div>
                <Button type="submit" disabled={pending !== null}>
                  {pending === 'theme' ? 'Saving…' : 'Save Banners'}
                </Button>
              </div>

              {/* Hero Banner Slot */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Hero Banner Slot
                  </h3>
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={theme.heroBanner.enabled}
                      onChange={(e) =>
                        setTheme((prev) => ({
                          ...prev,
                          heroBanner: { ...prev.heroBanner, enabled: e.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded border-border"
                    />
                    Enabled
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="font-medium text-foreground">Badge Text</span>
                    <input
                      type="text"
                      value={theme.heroBanner.badgeText || ''}
                      onChange={(e) =>
                        setTheme((prev) => ({
                          ...prev,
                          heroBanner: { ...prev.heroBanner, badgeText: e.target.value || null },
                        }))
                      }
                      className="h-9 rounded border border-border bg-background px-3 text-xs"
                      placeholder="e.g. A marketplace for everyday finds"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="font-medium text-foreground">Image Media URL (Optional)</span>
                    <input
                      type="text"
                      value={theme.heroBanner.imageUrl || ''}
                      onChange={(e) =>
                        setTheme((prev) => ({
                          ...prev,
                          heroBanner: { ...prev.heroBanner, imageUrl: e.target.value || null },
                        }))
                      }
                      className="h-9 rounded border border-border bg-background px-3 text-xs"
                      placeholder="https://..."
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-medium text-foreground">Hero Headline</span>
                  <input
                    type="text"
                    value={theme.heroBanner.title}
                    onChange={(e) =>
                      setTheme((prev) => ({
                        ...prev,
                        heroBanner: { ...prev.heroBanner, title: e.target.value },
                      }))
                    }
                    className="h-9 rounded border border-border bg-background px-3 text-xs"
                    placeholder="e.g. Good finds. Close to home."
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-medium text-foreground">Subheadline Copy</span>
                  <textarea
                    rows={2}
                    value={theme.heroBanner.subtitle}
                    onChange={(e) =>
                      setTheme((prev) => ({
                        ...prev,
                        heroBanner: { ...prev.heroBanner, subtitle: e.target.value },
                      }))
                    }
                    className="rounded border border-border bg-background p-2.5 text-xs"
                    placeholder="Describe your marketplace highlights..."
                  />
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="font-medium text-foreground">CTA Button Label</span>
                    <input
                      type="text"
                      value={theme.heroBanner.ctaText || ''}
                      onChange={(e) =>
                        setTheme((prev) => ({
                          ...prev,
                          heroBanner: { ...prev.heroBanner, ctaText: e.target.value || null },
                        }))
                      }
                      className="h-9 rounded border border-border bg-background px-3 text-xs"
                      placeholder="e.g. Explore offers"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="font-medium text-foreground">CTA Destination URL</span>
                    <input
                      type="text"
                      value={theme.heroBanner.ctaUrl || ''}
                      onChange={(e) =>
                        setTheme((prev) => ({
                          ...prev,
                          heroBanner: { ...prev.heroBanner, ctaUrl: e.target.value || null },
                        }))
                      }
                      className="h-9 rounded border border-border bg-background px-3 text-xs"
                      placeholder="e.g. /search"
                    />
                  </label>
                </div>
              </div>

              {/* Promotional Banner Strip */}
              <div className="space-y-4 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Promotional Banner Strip
                  </h3>
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={theme.promoBanner.enabled}
                      onChange={(e) =>
                        setTheme((prev) => ({
                          ...prev,
                          promoBanner: { ...prev.promoBanner, enabled: e.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded border-border"
                    />
                    Enabled
                  </label>
                </div>

                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-medium text-foreground">Promotional Title</span>
                  <input
                    type="text"
                    value={theme.promoBanner.title}
                    onChange={(e) =>
                      setTheme((prev) => ({
                        ...prev,
                        promoBanner: { ...prev.promoBanner, title: e.target.value },
                      }))
                    }
                    className="h-9 rounded border border-border bg-background px-3 text-xs"
                    placeholder="e.g. Sell on Octopus"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-medium text-foreground">Promotional Body Copy</span>
                  <textarea
                    rows={2}
                    value={theme.promoBanner.text}
                    onChange={(e) =>
                      setTheme((prev) => ({
                        ...prev,
                        promoBanner: { ...prev.promoBanner, text: e.target.value },
                      }))
                    }
                    className="rounded border border-border bg-background p-2.5 text-xs"
                    placeholder="Short promotional description..."
                  />
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="font-medium text-foreground">CTA Label</span>
                    <input
                      type="text"
                      value={theme.promoBanner.ctaText || ''}
                      onChange={(e) =>
                        setTheme((prev) => ({
                          ...prev,
                          promoBanner: { ...prev.promoBanner, ctaText: e.target.value || null },
                        }))
                      }
                      className="h-9 rounded border border-border bg-background px-3 text-xs"
                      placeholder="e.g. Open vendor portal"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="font-medium text-foreground">CTA URL</span>
                    <input
                      type="text"
                      value={theme.promoBanner.ctaUrl || ''}
                      onChange={(e) =>
                        setTheme((prev) => ({
                          ...prev,
                          promoBanner: { ...prev.promoBanner, ctaUrl: e.target.value || null },
                        }))
                      }
                      className="h-9 rounded border border-border bg-background px-3 text-xs"
                      placeholder="e.g. /vendor"
                    />
                  </label>
                </div>
              </div>
            </form>
          )}

          {activeTab === 'header_footer' && (
            <form
              onSubmit={(e) => void onSaveTheme(e)}
              className="space-y-6 rounded-lg border border-border bg-card p-5"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    Header & Footer Configuration
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Configure search placeholder, navigation links, and footer columns.
                  </p>
                </div>
                <Button type="submit" disabled={pending !== null}>
                  {pending === 'theme' ? 'Saving…' : 'Save Header & Footer'}
                </Button>
              </div>

              {/* Header Settings */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Storefront Header
                </h3>
                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-medium text-foreground">Search Bar Placeholder</span>
                  <input
                    type="text"
                    value={theme.header.searchPlaceholder || ''}
                    onChange={(e) =>
                      setTheme((prev) => ({
                        ...prev,
                        header: { ...prev.header, searchPlaceholder: e.target.value || null },
                      }))
                    }
                    className="h-9 rounded border border-border bg-background px-3 text-xs"
                    placeholder="Search products"
                  />
                </label>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">
                      Header Navigation Links
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setTheme((prev) => ({
                          ...prev,
                          header: {
                            ...prev.header,
                            navLinks: [
                              ...prev.header.navLinks,
                              { label: 'New Link', href: '/search' },
                            ],
                          },
                        }))
                      }
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      + Add Link
                    </button>
                  </div>
                  <div className="space-y-2">
                    {theme.header.navLinks.map((link, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={link.label}
                          onChange={(e) => {
                            const updated = [...theme.header.navLinks];
                            updated[idx] = { ...updated[idx]!, label: e.target.value };
                            setTheme((prev) => ({
                              ...prev,
                              header: { ...prev.header, navLinks: updated },
                            }));
                          }}
                          placeholder="Label"
                          className="h-8 flex-1 rounded border border-border bg-background px-2.5 text-xs"
                        />
                        <input
                          type="text"
                          value={link.href}
                          onChange={(e) => {
                            const updated = [...theme.header.navLinks];
                            updated[idx] = { ...updated[idx]!, href: e.target.value };
                            setTheme((prev) => ({
                              ...prev,
                              header: { ...prev.header, navLinks: updated },
                            }));
                          }}
                          placeholder="/path"
                          className="h-8 flex-1 rounded border border-border bg-background px-2.5 text-xs font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = theme.header.navLinks.filter((_, i) => i !== idx);
                            setTheme((prev) => ({
                              ...prev,
                              header: { ...prev.header, navLinks: updated },
                            }));
                          }}
                          className="rounded px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer Settings */}
              <div className="space-y-4 border-t border-border pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Storefront Footer
                </h3>
                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-medium text-foreground">About / Mission Text</span>
                  <textarea
                    rows={2}
                    value={theme.footer.aboutText || ''}
                    onChange={(e) =>
                      setTheme((prev) => ({
                        ...prev,
                        footer: { ...prev.footer, aboutText: e.target.value || null },
                      }))
                    }
                    className="rounded border border-border bg-background p-2.5 text-xs"
                    placeholder="Short marketplace description in footer..."
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-medium text-foreground">Custom Copyright Notice</span>
                  <input
                    type="text"
                    value={theme.footer.copyrightText || ''}
                    onChange={(e) =>
                      setTheme((prev) => ({
                        ...prev,
                        footer: { ...prev.footer, copyrightText: e.target.value || null },
                      }))
                    }
                    className="h-9 rounded border border-border bg-background px-3 text-xs"
                    placeholder={`e.g. ${siteTitle} Inc. All rights reserved.`}
                  />
                </label>

                {/* Footer Columns Editor */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">
                      Footer Quick Link Columns
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setTheme((prev) => ({
                          ...prev,
                          footer: {
                            ...prev.footer,
                            columns: [
                              ...prev.footer.columns,
                              { title: 'New Column', links: [{ label: 'Link', href: '/' }] },
                            ],
                          },
                        }))
                      }
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      + Add Column
                    </button>
                  </div>

                  <div className="space-y-4">
                    {theme.footer.columns.map((col, colIdx) => (
                      <div
                        key={colIdx}
                        className="rounded border border-border p-3 space-y-2 bg-muted/20"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={col.title}
                            onChange={(e) => {
                              const updated = [...theme.footer.columns];
                              updated[colIdx] = { ...updated[colIdx]!, title: e.target.value };
                              setTheme((prev) => ({
                                ...prev,
                                footer: { ...prev.footer, columns: updated },
                              }));
                            }}
                            className="h-7 font-semibold text-xs rounded border border-border bg-background px-2"
                            placeholder="Column Title"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = theme.footer.columns.filter((_, i) => i !== colIdx);
                              setTheme((prev) => ({
                                ...prev,
                                footer: { ...prev.footer, columns: updated },
                              }));
                            }}
                            className="text-2xs text-destructive hover:underline"
                          >
                            Remove Column
                          </button>
                        </div>

                        <div className="space-y-1.5 pl-2">
                          {col.links.map((link, lIdx) => (
                            <div key={lIdx} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={link.label}
                                onChange={(e) => {
                                  const updatedCols = [...theme.footer.columns];
                                  const updatedLinks = [...updatedCols[colIdx]!.links];
                                  updatedLinks[lIdx] = {
                                    ...updatedLinks[lIdx]!,
                                    label: e.target.value,
                                  };
                                  updatedCols[colIdx] = {
                                    ...updatedCols[colIdx]!,
                                    links: updatedLinks,
                                  };
                                  setTheme((prev) => ({
                                    ...prev,
                                    footer: { ...prev.footer, columns: updatedCols },
                                  }));
                                }}
                                placeholder="Link Label"
                                className="h-6 flex-1 rounded border border-border bg-background px-2 text-2xs"
                              />
                              <input
                                type="text"
                                value={link.href}
                                onChange={(e) => {
                                  const updatedCols = [...theme.footer.columns];
                                  const updatedLinks = [...updatedCols[colIdx]!.links];
                                  updatedLinks[lIdx] = {
                                    ...updatedLinks[lIdx]!,
                                    href: e.target.value,
                                  };
                                  updatedCols[colIdx] = {
                                    ...updatedCols[colIdx]!,
                                    links: updatedLinks,
                                  };
                                  setTheme((prev) => ({
                                    ...prev,
                                    footer: { ...prev.footer, columns: updatedCols },
                                  }));
                                }}
                                placeholder="/path"
                                className="h-6 flex-1 rounded border border-border bg-background px-2 text-2xs font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedCols = [...theme.footer.columns];
                                  const updatedLinks = updatedCols[colIdx]!.links.filter(
                                    (_, i) => i !== lIdx,
                                  );
                                  updatedCols[colIdx] = {
                                    ...updatedCols[colIdx]!,
                                    links: updatedLinks,
                                  };
                                  setTheme((prev) => ({
                                    ...prev,
                                    footer: { ...prev.footer, columns: updatedCols },
                                  }));
                                }}
                                className="text-2xs text-destructive px-1"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const updatedCols = [...theme.footer.columns];
                              const updatedLinks = [
                                ...updatedCols[colIdx]!.links,
                                { label: 'New Link', href: '/' },
                              ];
                              updatedCols[colIdx] = {
                                ...updatedCols[colIdx]!,
                                links: updatedLinks,
                              };
                              setTheme((prev) => ({
                                ...prev,
                                footer: { ...prev.footer, columns: updatedCols },
                              }));
                            }}
                            className="text-2xs text-primary hover:underline pt-1 block"
                          >
                            + Add Link to {col.title}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </form>
          )}

          {activeTab === 'branding' && (
            <form
              onSubmit={(e) => void onSaveBranding(e)}
              className="space-y-4 rounded-lg border border-border bg-card p-5"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Branding & Identity</h2>
                  <p className="text-xs text-muted-foreground">
                    Platform brand name, tagline, logo media references.
                  </p>
                </div>
                <Button type="submit" disabled={pending !== null}>
                  {pending === 'branding' ? 'Saving…' : 'Save Branding'}
                </Button>
              </div>

              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-foreground">Site name</span>
                <input
                  name="siteName"
                  value={branding?.siteName ?? ''}
                  onChange={(e) =>
                    setBranding((prev) => (prev ? { ...prev, siteName: e.target.value } : null))
                  }
                  className="h-9 rounded-md border border-border bg-background px-3 text-xs"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-foreground">Tagline</span>
                <input
                  name="tagline"
                  value={branding?.tagline ?? ''}
                  onChange={(e) =>
                    setBranding((prev) => (prev ? { ...prev, tagline: e.target.value } : null))
                  }
                  className="h-9 rounded-md border border-border bg-background px-3 text-xs"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-foreground">Primary brand hex color</span>
                <input
                  name="primaryColor"
                  placeholder="#0f172a"
                  value={branding?.primaryColor ?? ''}
                  onChange={(e) =>
                    setBranding((prev) => (prev ? { ...prev, primaryColor: e.target.value } : null))
                  }
                  className="h-9 rounded-md border border-border bg-background px-3 text-xs font-mono"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-foreground">Logo media ID</span>
                <input
                  name="logoMediaId"
                  value={branding?.logoMediaId ?? ''}
                  onChange={(e) =>
                    setBranding((prev) => (prev ? { ...prev, logoMediaId: e.target.value } : null))
                  }
                  className="h-9 rounded-md border border-border bg-background px-3 text-xs font-mono"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-foreground">Favicon media ID</span>
                <input
                  name="faviconMediaId"
                  value={branding?.faviconMediaId ?? ''}
                  onChange={(e) =>
                    setBranding((prev) =>
                      prev ? { ...prev, faviconMediaId: e.target.value } : null,
                    )
                  }
                  className="h-9 rounded-md border border-border bg-background px-3 text-xs font-mono"
                />
              </label>
            </form>
          )}

          {activeTab === 'general' && (
            <form
              onSubmit={(e) => void onSaveGeneral(e)}
              className="space-y-4 rounded-lg border border-border bg-card p-5"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    General Marketplace Config
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Support email and regional currency/locale defaults.
                  </p>
                </div>
                <Button type="submit" disabled={pending !== null}>
                  {pending === 'general' ? 'Saving…' : 'Save General'}
                </Button>
              </div>

              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-foreground">Support email</span>
                <input
                  name="supportEmail"
                  type="email"
                  value={general?.supportEmail ?? ''}
                  onChange={(e) =>
                    setGeneral((prev) => (prev ? { ...prev, supportEmail: e.target.value } : null))
                  }
                  className="h-9 rounded-md border border-border bg-background px-3 text-xs"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-foreground">Default locale</span>
                <input
                  name="defaultLocale"
                  value={general?.defaultLocale ?? 'en'}
                  onChange={(e) =>
                    setGeneral((prev) => (prev ? { ...prev, defaultLocale: e.target.value } : null))
                  }
                  className="h-9 rounded-md border border-border bg-background px-3 text-xs"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-foreground">Default currency</span>
                <input
                  name="defaultCurrencyCode"
                  value={general?.defaultCurrencyCode ?? 'BDT'}
                  onChange={(e) =>
                    setGeneral((prev) =>
                      prev ? { ...prev, defaultCurrencyCode: e.target.value } : null,
                    )
                  }
                  className="h-9 rounded-md border border-border bg-background px-3 text-xs"
                />
              </label>
            </form>
          )}
        </div>

        {/* Live Theme Preview Panel */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Live Storefront Preview
              </h2>
            </div>
            <div className="flex items-center gap-1 rounded-md border border-border p-0.5 bg-muted/40">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`rounded px-2.5 py-1 text-2xs font-medium transition-colors ${
                  previewDevice === 'desktop'
                    ? 'bg-background shadow-xs text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`rounded px-2.5 py-1 text-2xs font-medium transition-colors ${
                  previewDevice === 'mobile'
                    ? 'bg-background shadow-xs text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Mobile
              </button>
            </div>
          </div>

          <div
            className={`mx-auto overflow-hidden rounded-xl border border-border bg-background shadow-xl transition-all ${
              previewDevice === 'mobile' ? 'max-w-xs' : 'w-full'
            }`}
            style={
              {
                '--cf-accent':
                  normalizeCssHexColor(theme.colors.accent) ||
                  normalizeCssHexColor(branding?.primaryColor) ||
                  '#2563eb',
                '--cf-primary': normalizeCssHexColor(theme.colors.primary) || '#0f172a',
              } as CSSProperties
            }
          >
            {/* Miniature Browser Shell Chrome */}
            <div className="flex items-center gap-1.5 border-b border-border bg-muted/60 px-3 py-2 text-2xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="ml-2 font-mono text-3xs truncate">https://shop.octopus.local/</span>
            </div>

            {/* Simulated Live Announcement Bar */}
            {theme.announcementBar.enabled ? (
              <div
                className="px-3 py-1 text-center text-3xs font-medium"
                style={{
                  backgroundColor:
                    normalizeCssHexColor(theme.colors.announcementBg) || '#1e293b',
                  color: normalizeCssHexColor(theme.colors.announcementText) || '#ffffff',
                }}
              >
                <span>{theme.announcementBar.text}</span>
                {theme.announcementBar.linkText ? (
                  <span className="ml-2 underline opacity-90 cursor-default">
                    {theme.announcementBar.linkText}
                  </span>
                ) : null}
              </div>
            ) : null}

            {/* Simulated Live Header */}
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 bg-card">
              <div className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-foreground font-bold text-background text-3xs">
                  O.
                </span>
                <span className="font-bold text-xs truncate max-w-[120px]">{siteTitle}</span>
              </div>
              <div className="hidden sm:flex flex-1 max-w-[140px]">
                <div className="w-full rounded border border-border bg-muted/30 px-2 py-0.5 text-3xs text-muted-foreground truncate">
                  {theme.header.searchPlaceholder || 'Search products'}
                </div>
              </div>
              <nav className="flex items-center gap-2 text-3xs text-muted-foreground">
                {theme.header.navLinks
                  .slice(0, previewDevice === 'mobile' ? 2 : 4)
                  .map((link, i) => (
                    <span key={i} className="hover:text-foreground cursor-default">
                      {link.label}
                    </span>
                  ))}
              </nav>
            </div>

            {/* Simulated Live Hero Banner */}
            {theme.heroBanner.enabled ? (
              <div
                className="relative overflow-hidden p-4 text-white"
                style={{
                  backgroundColor: normalizeCssHexColor(theme.colors.primary) || '#0f172a',
                  backgroundImage: theme.heroBanner.imageUrl
                    ? `linear-gradient(rgba(15,23,42,0.8), rgba(15,23,42,0.9)), url(${theme.heroBanner.imageUrl})`
                    : undefined,
                  backgroundSize: 'cover',
                }}
              >
                <span className="inline-block rounded-full bg-white/20 px-2 py-0.5 text-3xs uppercase tracking-wider text-white/80">
                  {theme.heroBanner.badgeText || 'Featured'}
                </span>
                <h3 className="mt-1 font-bold text-sm tracking-tight leading-snug">
                  {theme.heroBanner.title}
                </h3>
                <p className="mt-1 text-3xs text-white/75 line-clamp-2 leading-relaxed">
                  {theme.heroBanner.subtitle}
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <span
                    className="inline-block rounded px-2.5 py-1 text-3xs font-semibold shadow-xs"
                    style={{
                      backgroundColor: normalizeCssHexColor(theme.colors.accent) || '#2563eb',
                      color: '#ffffff',
                    }}
                  >
                    {theme.heroBanner.ctaText || 'Explore'}
                  </span>
                  <span className="inline-block rounded border border-white/30 px-2 py-1 text-3xs font-medium text-white/80">
                    Browse
                  </span>
                </div>
              </div>
            ) : null}

            {/* Simulated Live Storefront Body Grid */}
            <div className="p-3 space-y-3 bg-muted/10">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded border border-border bg-card p-2 text-3xs shadow-2xs">
                  <span className="font-bold text-primary">01</span>
                  <p className="font-medium mt-0.5">Local Delivery</p>
                </div>
                <div className="rounded border border-border bg-card p-2 text-3xs shadow-2xs">
                  <span className="font-bold text-primary">02</span>
                  <p className="font-medium mt-0.5">Verified Stores</p>
                </div>
              </div>

              {/* Simulated Promo Banner Strip */}
              {theme.promoBanner.enabled ? (
                <div className="rounded-lg border border-border bg-gradient-to-r from-muted/60 to-background p-2.5">
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-4xs font-bold text-primary">
                    PROMO
                  </span>
                  <h4 className="mt-1 font-semibold text-2xs text-foreground leading-tight">
                    {theme.promoBanner.title}
                  </h4>
                  <p className="text-3xs text-muted-foreground mt-0.5 line-clamp-2">
                    {theme.promoBanner.text}
                  </p>
                  {theme.promoBanner.ctaText ? (
                    <span
                      className="mt-1.5 inline-block rounded px-2 py-0.5 text-4xs font-bold text-white shadow-2xs"
                      style={{
                        backgroundColor: normalizeCssHexColor(theme.colors.accent) || '#2563eb',
                      }}
                    >
                      {theme.promoBanner.ctaText}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Simulated Live Footer */}
            <div className="border-t border-border bg-card p-3 text-3xs space-y-2">
              <div className="flex flex-col sm:flex-row justify-between gap-3">
                <div className="max-w-[140px]">
                  <p className="font-bold text-2xs text-foreground">{siteTitle}</p>
                  <p className="text-4xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                    {theme.footer.aboutText}
                  </p>
                </div>
                <div className="flex gap-4">
                  {theme.footer.columns
                    .slice(0, previewDevice === 'mobile' ? 2 : 3)
                    .map((col, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <p className="font-semibold text-4xs uppercase tracking-wider text-muted-foreground">
                          {col.title}
                        </p>
                        {col.links.slice(0, 3).map((l, lIdx) => (
                          <p key={lIdx} className="text-4xs text-foreground/80">
                            {l.label}
                          </p>
                        ))}
                      </div>
                    ))}
                </div>
              </div>
              <div className="border-t border-border/60 pt-2 text-4xs text-muted-foreground flex justify-between">
                <span>
                  © {new Date().getFullYear()} {theme.footer.copyrightText || siteTitle}
                </span>
                <span>Octopus Platform</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
