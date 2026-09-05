'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import { fetchGlobalConfig, patchGlobalConfig } from '@/lib/global-config-api';
import {
  DEFAULT_MARKETING_SYSTEM_SETTINGS,
  DEFAULT_OPERATIONS_SETTINGS,
  DEFAULT_SEO_SYSTEM_SETTINGS,
  mapGlobalConfigToOperationsForm,
  mapMarketingSystemSettingsToForm,
  mapSeoSystemSettingsToForm,
  marketingSystemFormToPatch,
  operationsFormToPatch,
  seoSystemFormToPatch,
  updateMarketingSystemField,
  updateOperationsField,
  updateSeoSystemField,
  type GlobalConfigTab,
  type MarketingSystemSettingsForm,
  type OperationsSettingsForm,
  type SeoSystemSettingsForm,
} from '@/lib/global-config-form-state';
import { fetchSeoSystemSettings, patchSeoSystemSettings } from '@/lib/seo-admin-api';
import { useAccessToken } from '@/lib/use-access-token';
import { cn } from '@/lib/cn';

const TABS: readonly { id: GlobalConfigTab; label: string }[] = [
  { id: 'seo', label: 'SEO & Search Engines' },
  { id: 'marketing', label: 'Marketing & Ad Platforms' },
  { id: 'operations', label: 'Store Core Operations' },
];

function fieldClassName() {
  return 'h-10 w-full rounded-md border border-border bg-background px-3 text-sm';
}

function labelClassName() {
  return 'flex flex-col gap-1 text-sm';
}

export function GlobalConfigDashboard() {
  const token = useAccessToken();
  const [activeTab, setActiveTab] = useState<GlobalConfigTab>('seo');
  const [seoForm, setSeoForm] = useState<SeoSystemSettingsForm>(DEFAULT_SEO_SYSTEM_SETTINGS);
  const [marketingForm, setMarketingForm] = useState<MarketingSystemSettingsForm>(
    DEFAULT_MARKETING_SYSTEM_SETTINGS,
  );
  const [operationsForm, setOperationsForm] = useState<OperationsSettingsForm>(
    DEFAULT_OPERATIONS_SETTINGS,
  );
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setError('Sign in required to load platform configuration.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [globalConfig, seoSettings] = await Promise.all([
        fetchGlobalConfig(token),
        fetchSeoSystemSettings(token),
      ]);
      setSeoForm(mapSeoSystemSettingsToForm(seoSettings.settings));
      setMarketingForm(mapMarketingSystemSettingsToForm(seoSettings.settings));
      setOperationsForm(mapGlobalConfigToOperationsForm(globalConfig.settings));
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : 'Could not load platform configuration.',
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || pending) {
      return;
    }
    setPending(true);
    setSaved(null);
    setError(null);
    try {
      if (activeTab === 'seo') {
        await patchSeoSystemSettings(token, seoSystemFormToPatch(seoForm));
        setSaved(
          'SEO settings saved. Redis caches were invalidated — changes apply on the next request.',
        );
      } else if (activeTab === 'marketing') {
        await patchSeoSystemSettings(token, marketingSystemFormToPatch(marketingForm));
        setSaved(
          'Marketing settings saved. Redis caches were invalidated — tracking picks up changes immediately.',
        );
      } else {
        await patchGlobalConfig(token, operationsFormToPatch(operationsForm));
        setSaved(
          'Store operations saved. Redis caches were invalidated — checkout and catalog use the new values.',
        );
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Save failed.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Platform configuration"
        description="Manage SEO, marketing integrations, and store operations from one control plane. Values persist in PostgreSQL and invalidate Redis on save."
      />
      <p className="text-sm text-muted-foreground">
        APIs: <code className="text-xs">GET/PATCH /admin/config</code>,{' '}
        <code className="text-xs">GET/PATCH /admin/seo/settings</code>.{' '}
        <Link href="/admin/system/seo" className="underline">
          SEO health & overrides
        </Link>
      </p>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <div
          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
          role="status"
        >
          {saved}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={cn(
              'rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading configuration…</p>
      ) : (
        <form
          onSubmit={(e) => void onSubmit(e)}
          className="max-w-2xl space-y-4 border border-border p-4"
        >
          {activeTab === 'seo' ? (
            <>
              <h2 className="text-lg font-medium">SEO &amp; Search Engines</h2>
              <p className="text-sm text-muted-foreground">
                Sitemap schedules, canonical URL, and Google Search Console service account
                credentials.
              </p>
              <label className={labelClassName()}>
                <span className="text-muted-foreground">Sitemap cron (BullMQ)</span>
                <input
                  className={fieldClassName()}
                  value={seoForm.SEO_SITEMAP_CRON}
                  onChange={(e) =>
                    setSeoForm((prev) =>
                      updateSeoSystemField(prev, 'SEO_SITEMAP_CRON', e.target.value),
                    )
                  }
                />
              </label>
              <label className={labelClassName()}>
                <span className="text-muted-foreground">Sitemap items per chunk</span>
                <input
                  className={fieldClassName()}
                  inputMode="numeric"
                  value={seoForm.SITEMAP_ITEMS_PER_CHUNK}
                  onChange={(e) =>
                    setSeoForm((prev) =>
                      updateSeoSystemField(prev, 'SITEMAP_ITEMS_PER_CHUNK', e.target.value),
                    )
                  }
                />
              </label>
              <label className={labelClassName()}>
                <span className="text-muted-foreground">Canonical app URL</span>
                <input
                  className={fieldClassName()}
                  value={seoForm.SEO_CANONICAL_APP_URL}
                  onChange={(e) =>
                    setSeoForm((prev) =>
                      updateSeoSystemField(prev, 'SEO_CANONICAL_APP_URL', e.target.value),
                    )
                  }
                  placeholder="https://shop.example.com"
                />
              </label>
              <label className={labelClassName()}>
                <span className="text-muted-foreground">Google Search Console client email</span>
                <input
                  className={fieldClassName()}
                  value={seoForm.GOOGLE_SERVICES_CLIENT_EMAIL}
                  onChange={(e) =>
                    setSeoForm((prev) =>
                      updateSeoSystemField(prev, 'GOOGLE_SERVICES_CLIENT_EMAIL', e.target.value),
                    )
                  }
                />
              </label>
              <label className={labelClassName()}>
                <span className="text-muted-foreground">
                  Google Search Console private key (PEM)
                </span>
                <textarea
                  className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs"
                  value={seoForm.GOOGLE_SERVICES_PRIVATE_KEY}
                  onChange={(e) =>
                    setSeoForm((prev) =>
                      updateSeoSystemField(prev, 'GOOGLE_SERVICES_PRIVATE_KEY', e.target.value),
                    )
                  }
                />
              </label>
            </>
          ) : null}

          {activeTab === 'marketing' ? (
            <>
              <h2 className="text-lg font-medium">Marketing &amp; Ad Platforms</h2>
              <p className="text-sm text-muted-foreground">
                GTM, GA4, Meta Pixel/CAPI, GEM schema, and Andromeda privacy options.
              </p>
              <label className={labelClassName()}>
                <span className="text-muted-foreground">GTM container ID</span>
                <input
                  className={fieldClassName()}
                  value={marketingForm.MARKETING_GTM_CONTAINER_ID}
                  onChange={(e) =>
                    setMarketingForm((prev) =>
                      updateMarketingSystemField(
                        prev,
                        'MARKETING_GTM_CONTAINER_ID',
                        e.target.value,
                      ),
                    )
                  }
                  placeholder="GTM-XXXXXXX"
                />
              </label>
              <label className={labelClassName()}>
                <span className="text-muted-foreground">GA4 measurement ID</span>
                <input
                  className={fieldClassName()}
                  value={marketingForm.MARKETING_GA4_MEASUREMENT_ID}
                  onChange={(e) =>
                    setMarketingForm((prev) =>
                      updateMarketingSystemField(
                        prev,
                        'MARKETING_GA4_MEASUREMENT_ID',
                        e.target.value,
                      ),
                    )
                  }
                  placeholder="G-XXXXXXXX"
                />
              </label>
              <label className={labelClassName()}>
                <span className="text-muted-foreground">GEM schema version</span>
                <input
                  className={fieldClassName()}
                  value={marketingForm.GEM_SCHEMA_VERSION}
                  onChange={(e) =>
                    setMarketingForm((prev) =>
                      updateMarketingSystemField(prev, 'GEM_SCHEMA_VERSION', e.target.value),
                    )
                  }
                />
              </label>
              <label className={labelClassName()}>
                <span className="text-muted-foreground">GEM tracking environment</span>
                <select
                  className={fieldClassName()}
                  value={marketingForm.GEM_TRACKING_ENVIRONMENT}
                  onChange={(e) =>
                    setMarketingForm((prev) =>
                      updateMarketingSystemField(prev, 'GEM_TRACKING_ENVIRONMENT', e.target.value),
                    )
                  }
                >
                  <option value="production">production</option>
                  <option value="staging">staging</option>
                  <option value="development">development</option>
                </select>
              </label>
              <label className={labelClassName()}>
                <span className="text-muted-foreground">Meta Pixel ID</span>
                <input
                  className={fieldClassName()}
                  value={marketingForm.META_PIXEL_ID}
                  onChange={(e) =>
                    setMarketingForm((prev) =>
                      updateMarketingSystemField(prev, 'META_PIXEL_ID', e.target.value),
                    )
                  }
                />
              </label>
              <label className={labelClassName()}>
                <span className="text-muted-foreground">Meta CAPI access token</span>
                <input
                  type="password"
                  className={fieldClassName()}
                  value={marketingForm.META_ACCESS_TOKEN}
                  onChange={(e) =>
                    setMarketingForm((prev) =>
                      updateMarketingSystemField(prev, 'META_ACCESS_TOKEN', e.target.value),
                    )
                  }
                />
              </label>
              <label className={labelClassName()}>
                <span className="text-muted-foreground">
                  Andromeda data processing options (JSON)
                </span>
                <input
                  className={fieldClassName()}
                  value={marketingForm.META_ANDROMEDA_DATA_PROCESSING_OPTIONS}
                  onChange={(e) =>
                    setMarketingForm((prev) =>
                      updateMarketingSystemField(
                        prev,
                        'META_ANDROMEDA_DATA_PROCESSING_OPTIONS',
                        e.target.value,
                      ),
                    )
                  }
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClassName()}>
                  <span className="text-muted-foreground">Andromeda country code</span>
                  <input
                    className={fieldClassName()}
                    inputMode="numeric"
                    value={marketingForm.META_ANDROMEDA_COUNTRY}
                    onChange={(e) =>
                      setMarketingForm((prev) =>
                        updateMarketingSystemField(prev, 'META_ANDROMEDA_COUNTRY', e.target.value),
                      )
                    }
                  />
                </label>
                <label className={labelClassName()}>
                  <span className="text-muted-foreground">Andromeda state code</span>
                  <input
                    className={fieldClassName()}
                    inputMode="numeric"
                    value={marketingForm.META_ANDROMEDA_STATE}
                    onChange={(e) =>
                      setMarketingForm((prev) =>
                        updateMarketingSystemField(prev, 'META_ANDROMEDA_STATE', e.target.value),
                      )
                    }
                  />
                </label>
              </div>
              <label className={labelClassName()}>
                <span className="text-muted-foreground">Meta CAPI data source</span>
                <select
                  className={fieldClassName()}
                  value={marketingForm.META_CAPI_DATA_SOURCE}
                  onChange={(e) =>
                    setMarketingForm((prev) =>
                      updateMarketingSystemField(prev, 'META_CAPI_DATA_SOURCE', e.target.value),
                    )
                  }
                >
                  <option value="server">server</option>
                  <option value="system_generated">system_generated</option>
                </select>
              </label>
            </>
          ) : null}

          {activeTab === 'operations' ? (
            <>
              <h2 className="text-lg font-medium">Store Core Operations</h2>
              <p className="text-sm text-muted-foreground">
                Catalog defaults, checkout rules, free-shipping threshold, and payment gateway
                toggles.
              </p>
              <label className={labelClassName()}>
                <span className="text-muted-foreground">Default currency code</span>
                <input
                  className={fieldClassName()}
                  value={operationsForm.default_currency_code}
                  onChange={(e) =>
                    setOperationsForm((prev) =>
                      updateOperationsField(prev, 'default_currency_code', e.target.value),
                    )
                  }
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={operationsForm.hide_out_of_stock}
                  onChange={(e) =>
                    setOperationsForm((prev) =>
                      updateOperationsField(prev, 'hide_out_of_stock', e.target.checked),
                    )
                  }
                />
                <span>Hide out-of-stock products from search</span>
              </label>
              <label className={labelClassName()}>
                <span className="text-muted-foreground">Default low-stock threshold</span>
                <input
                  className={fieldClassName()}
                  inputMode="numeric"
                  value={operationsForm.low_stock_threshold}
                  onChange={(e) =>
                    setOperationsForm((prev) =>
                      updateOperationsField(prev, 'low_stock_threshold', e.target.value),
                    )
                  }
                />
              </label>
              <label className={labelClassName()}>
                <span className="text-muted-foreground">Minimum order (minor units)</span>
                <input
                  className={fieldClassName()}
                  inputMode="numeric"
                  value={operationsForm.minimum_order_minor}
                  onChange={(e) =>
                    setOperationsForm((prev) =>
                      updateOperationsField(prev, 'minimum_order_minor', e.target.value),
                    )
                  }
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={operationsForm.guest_checkout_enabled}
                  onChange={(e) =>
                    setOperationsForm((prev) =>
                      updateOperationsField(prev, 'guest_checkout_enabled', e.target.checked),
                    )
                  }
                />
                <span>Guest checkout enabled</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={operationsForm.tax_computation_enabled}
                  onChange={(e) =>
                    setOperationsForm((prev) =>
                      updateOperationsField(prev, 'tax_computation_enabled', e.target.checked),
                    )
                  }
                />
                <span>Automated tax computation enabled</span>
              </label>
              <label className={labelClassName()}>
                <span className="text-muted-foreground">Tax rate (basis points)</span>
                <input
                  className={fieldClassName()}
                  inputMode="numeric"
                  value={operationsForm.tax_rate_bps}
                  onChange={(e) =>
                    setOperationsForm((prev) =>
                      updateOperationsField(prev, 'tax_rate_bps', e.target.value),
                    )
                  }
                />
              </label>
              <label className={labelClassName()}>
                <span className="text-muted-foreground">Free shipping threshold (minor units)</span>
                <input
                  className={fieldClassName()}
                  inputMode="numeric"
                  value={operationsForm.free_shipping_threshold_minor}
                  onChange={(e) =>
                    setOperationsForm((prev) =>
                      updateOperationsField(prev, 'free_shipping_threshold_minor', e.target.value),
                    )
                  }
                />
              </label>
              <fieldset className="space-y-2 border border-border p-3">
                <legend className="px-1 text-sm font-medium">Payment gateway kill-switches</legend>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={operationsForm.cod_enabled}
                    onChange={(e) =>
                      setOperationsForm((prev) =>
                        updateOperationsField(prev, 'cod_enabled', e.target.checked),
                      )
                    }
                  />
                  <span>COD enabled</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={operationsForm.stripe_enabled}
                    onChange={(e) =>
                      setOperationsForm((prev) =>
                        updateOperationsField(prev, 'stripe_enabled', e.target.checked),
                      )
                    }
                  />
                  <span>Stripe / SSLCOMMERZ gateway enabled</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={operationsForm.adyen_enabled}
                    onChange={(e) =>
                      setOperationsForm((prev) =>
                        updateOperationsField(prev, 'adyen_enabled', e.target.checked),
                      )
                    }
                  />
                  <span>Adyen / wallet gateways enabled</span>
                </label>
              </fieldset>
            </>
          ) : null}

          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      )}
    </div>
  );
}
