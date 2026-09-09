'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { Button } from '@/components/ui/button';
import { ApiClientError, apiRequest } from '@/lib/api-client';
import { fetchGlobalConfig, patchGlobalConfig } from '@/lib/global-config-api';
import { useAccessToken } from '@/lib/use-access-token';

type GeneralSettings = {
  vendorRegistrationEnabled: boolean;
};

type TaxCommissionForm = {
  tax_computation_enabled: boolean;
  tax_rate_bps: string;
  commission_rate_bps: string;
};

const DEFAULT_TAX_COMMISSION: TaxCommissionForm = {
  tax_computation_enabled: false,
  tax_rate_bps: '0',
  commission_rate_bps: '0',
};

export default function AdminCommerceConfigPage() {
  const token = useAccessToken();
  const [vendorRegistrationEnabled, setVendorRegistrationEnabled] = useState(false);
  const [taxCommission, setTaxCommission] = useState<TaxCommissionForm>(DEFAULT_TAX_COMMISSION);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [taxPending, setTaxPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('Sign in required to load commerce settings.');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [general, globalConfig] = await Promise.all([
          apiRequest<{ value: GeneralSettings }>(
            '/admin/settings/effective?key=general&scopeKind=platform',
            { headers: { Authorization: `Bearer ${token}` } },
          ),
          fetchGlobalConfig(token),
        ]);
        if (!cancelled) {
          setVendorRegistrationEnabled(general.value.vendorRegistrationEnabled);
          const checkout = globalConfig.settings.checkout ?? {};
          setTaxCommission({
            tax_computation_enabled: Boolean(
              checkout.tax_computation_enabled ?? DEFAULT_TAX_COMMISSION.tax_computation_enabled,
            ),
            tax_rate_bps: String(
              checkout.tax_rate_bps ?? DEFAULT_TAX_COMMISSION.tax_rate_bps,
            ),
            commission_rate_bps: String(
              checkout.commission_rate_bps ?? DEFAULT_TAX_COMMISSION.commission_rate_bps,
            ),
          });
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError ? err.message : 'Could not load commerce settings.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function saveVendorRegistration(): Promise<void> {
    if (!token || pending) {
      return;
    }
    setPending(true);
    setError(null);
    setSaved(null);
    try {
      await apiRequest('/admin/settings', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: {
          key: 'general',
          scopeKind: 'platform',
          payload: { vendorRegistrationEnabled },
        },
      });
      setSaved(
        vendorRegistrationEnabled
          ? 'Vendor registration is now enabled.'
          : 'Vendor registration is now disabled.',
      );
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not save vendor registration.');
    } finally {
      setPending(false);
    }
  }

  async function saveTaxCommission(): Promise<void> {
    if (!token || taxPending) {
      return;
    }
    setTaxPending(true);
    setError(null);
    setSaved(null);
    try {
      await patchGlobalConfig(token, {
        checkout: {
          tax_computation_enabled: taxCommission.tax_computation_enabled,
          tax_rate_bps: Number(taxCommission.tax_rate_bps),
          commission_rate_bps: Number(taxCommission.commission_rate_bps),
        },
      });
      setSaved('Tax and commission rates saved.');
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : 'Could not save tax / commission settings.',
      );
    } finally {
      setTaxPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Commerce config"
        description="Control vendor onboarding, tax/commission rates, and COD settings across the marketplace."
      />
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="text-sm text-muted-foreground" role="status">
          {saved}
        </p>
      ) : null}
      <section className="space-y-3 border border-border p-4 text-sm">
        <h2 className="font-medium">Vendor registration</h2>
        <p className="text-muted-foreground">
          When enabled, authenticated customers can submit vendor applications for admin review.
          Applications start in pending status and do not bypass approval.
        </p>
        <label className="flex items-center gap-2" htmlFor="commerce-vendor-registration">
          <input
            id="commerce-vendor-registration"
            name="vendor_registration_enabled"
            type="checkbox"
            checked={vendorRegistrationEnabled}
            onChange={(event) => setVendorRegistrationEnabled(event.target.checked)}
            disabled={loading || pending}
          />
          Allow customer vendor applications
        </label>
        <Button
          type="button"
          onClick={() => void saveVendorRegistration()}
          disabled={loading || pending}
        >
          {pending ? 'Saving…' : 'Save vendor registration'}
        </Button>
      </section>
      <section className="space-y-3 border border-border p-4 text-sm">
        <h2 className="font-medium">Tax &amp; commission</h2>
        <p className="text-muted-foreground">
          Platform rates applied at checkout (basis points: 1000 = 10%). Tax only applies when
          automated tax computation is enabled. Commission is deducted from the taxable base when
          greater than zero. Full operations form also lives under{' '}
          <Link href="/admin/system/global-config" className="underline underline-offset-2">
            Global config
          </Link>
          .
        </p>
        <label className="flex items-center gap-2" htmlFor="commerce-tax-computation-enabled">
          <input
            id="commerce-tax-computation-enabled"
            name="tax_computation_enabled"
            type="checkbox"
            checked={taxCommission.tax_computation_enabled}
            onChange={(event) =>
              setTaxCommission((prev) => ({
                ...prev,
                tax_computation_enabled: event.target.checked,
              }))
            }
            disabled={loading || taxPending}
          />
          Automated tax computation enabled
        </label>
        <label className="flex flex-col gap-1" htmlFor="commerce-tax-rate-bps">
          <span className="text-muted-foreground">Tax rate (basis points)</span>
          <input
            id="commerce-tax-rate-bps"
            name="tax_rate_bps"
            className="border border-border bg-background px-2 py-1"
            inputMode="numeric"
            value={taxCommission.tax_rate_bps}
            onChange={(event) =>
              setTaxCommission((prev) => ({ ...prev, tax_rate_bps: event.target.value }))
            }
            disabled={loading || taxPending}
          />
        </label>
        <label className="flex flex-col gap-1" htmlFor="commerce-commission-rate-bps">
          <span className="text-muted-foreground">Platform commission rate (basis points)</span>
          <input
            id="commerce-commission-rate-bps"
            name="commission_rate_bps"
            className="border border-border bg-background px-2 py-1"
            inputMode="numeric"
            value={taxCommission.commission_rate_bps}
            onChange={(event) =>
              setTaxCommission((prev) => ({ ...prev, commission_rate_bps: event.target.value }))
            }
            disabled={loading || taxPending}
          />
        </label>
        <Button
          type="button"
          onClick={() => void saveTaxCommission()}
          disabled={loading || taxPending}
        >
          {taxPending ? 'Saving…' : 'Save tax & commission'}
        </Button>
      </section>
      <section className="space-y-3 border border-border p-4 text-sm">
        <h2 className="font-medium">Payment / COD</h2>
        <p className="text-muted-foreground">
          Enable COD and set min/max amounts (minor units) and reservation TTL on each vendor and
          store. Checkout requires both scopes enabled. Gateway kill-switches live under Global
          config and Payments.
        </p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <Link href={'/admin/vendors'} className="underline underline-offset-2">
              Vendors
            </Link>{' '}
            → open a vendor → COD settings
          </li>
          <li>
            <Link href={'/admin/stores'} className="underline underline-offset-2">
              Stores
            </Link>{' '}
            → open a store → COD settings
          </li>
        </ul>
      </section>
    </div>
  );
}
