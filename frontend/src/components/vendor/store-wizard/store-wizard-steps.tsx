'use client';

import type { StoreWizardPayload, StoreWizardStep } from '@/lib/store-wizard-flow';
import { fieldClass, labelClass } from '@/components/vendor/catalog/catalog-styles';

type StepProps = {
  readonly payload: StoreWizardPayload;
  readonly onChange: (section: keyof StoreWizardPayload, data: StoreWizardPayload[keyof StoreWizardPayload]) => void;
  readonly vendorName?: string;
};

const STORE_TYPES = [
  { value: 'online', label: 'Online store' },
  { value: 'physical', label: 'Physical store' },
  { value: 'online_physical', label: 'Online + physical' },
  { value: 'warehouse', label: 'Warehouse store' },
  { value: 'outlet', label: 'Outlet' },
  { value: 'pickup_point', label: 'Pickup point' },
  { value: 'popup', label: 'Pop-up store' },
  { value: 'marketplace', label: 'Marketplace store' },
];

export function StoreWizardStepContent({
  step,
  payload,
  onChange,
  vendorName,
}: StepProps & { readonly step: StoreWizardStep }) {
  switch (step) {
    case 1:
      return (
        <div className="space-y-3">
          <label className={labelClass}>
            Store name *
            <input
              className={fieldClass}
              value={payload.basic?.displayName ?? ''}
              onChange={(e) => onChange('basic', { displayName: e.target.value })}
              required
            />
          </label>
          <label className={labelClass}>
            Store code *
            <input
              className={fieldClass}
              value={payload.basic?.storeCode ?? ''}
              onChange={(e) => onChange('basic', { storeCode: e.target.value.toUpperCase() })}
              placeholder="GUL-001"
            />
          </label>
          <label className={labelClass}>
            Description
            <textarea
              className="min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={payload.basic?.description ?? ''}
              onChange={(e) => onChange('basic', { description: e.target.value })}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Phone
              <input
                className={fieldClass}
                value={payload.basic?.phone ?? ''}
                onChange={(e) => onChange('basic', { phone: e.target.value })}
              />
            </label>
            <label className={labelClass}>
              Email
              <input
                className={fieldClass}
                type="email"
                value={payload.basic?.email ?? ''}
                onChange={(e) => onChange('basic', { email: e.target.value })}
              />
            </label>
          </div>
          <label className={labelClass}>
            Support email
            <input
              className={fieldClass}
              type="email"
              value={payload.basic?.supportEmail ?? ''}
              onChange={(e) => onChange('basic', { supportEmail: e.target.value })}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className={labelClass}>
              Timezone
              <input
                className={fieldClass}
                value={payload.basic?.timezone ?? 'Asia/Dhaka'}
                onChange={(e) => onChange('basic', { timezone: e.target.value })}
              />
            </label>
            <label className={labelClass}>
              Language
              <input
                className={fieldClass}
                value={payload.basic?.locale ?? 'en-BD'}
                onChange={(e) => onChange('basic', { locale: e.target.value })}
              />
            </label>
            <label className={labelClass}>
              Currency
              <input
                className={fieldClass}
                value={payload.basic?.currencyCode ?? 'BDT'}
                onChange={(e) => onChange('basic', { currencyCode: e.target.value })}
              />
            </label>
          </div>
        </div>
      );
    case 2:
      return (
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Vendor: <span className="font-medium text-foreground">{vendorName ?? '—'}</span>
          </p>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={(payload.owner?.ownershipKind ?? 'vendor_owned') === 'vendor_owned'}
              onChange={() => onChange('owner', { ownershipKind: 'vendor_owned' })}
            />
            Vendor-owned store
          </label>
        </div>
      );
    case 3:
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          {STORE_TYPES.map((type) => (
            <label key={type.value} className="flex items-center gap-2 rounded-md border border-border p-3 text-sm">
              <input
                type="radio"
                name="storeType"
                checked={(payload.type?.storeType ?? 'online') === type.value}
                onChange={() => onChange('type', { storeType: type.value })}
              />
              {type.label}
            </label>
          ))}
        </div>
      );
    case 4:
      return (
        <div className="space-y-3">
          <label className={labelClass}>
            Country
            <input
              className={fieldClass}
              value={payload.location?.countryCode ?? 'BD'}
              onChange={(e) => onChange('location', { countryCode: e.target.value })}
            />
          </label>
          <label className={labelClass}>
            Division / state
            <input
              className={fieldClass}
              value={payload.location?.region ?? ''}
              onChange={(e) => onChange('location', { region: e.target.value })}
            />
          </label>
          <label className={labelClass}>
            City
            <input
              className={fieldClass}
              value={payload.location?.city ?? ''}
              onChange={(e) => onChange('location', { city: e.target.value })}
            />
          </label>
          <label className={labelClass}>
            Address
            <input
              className={fieldClass}
              value={payload.location?.addressLine1 ?? ''}
              onChange={(e) => onChange('location', { addressLine1: e.target.value })}
            />
          </label>
          <label className={labelClass}>
            Postal code
            <input
              className={fieldClass}
              value={payload.location?.postalCode ?? ''}
              onChange={(e) => onChange('location', { postalCode: e.target.value })}
            />
          </label>
        </div>
      );
    case 5:
      return (
        <div className="space-y-3">
          <label className={labelClass}>
            Hostname / subdomain
            <input
              className={fieldClass}
              value={payload.domain?.hostname ?? ''}
              onChange={(e) => onChange('domain', { hostname: e.target.value })}
              placeholder="gulshan.octopus.local"
            />
          </label>
          <p className="text-xs text-muted-foreground">DNS verification runs after provisioning.</p>
        </div>
      );
    case 6:
      return (
        <p className="text-sm text-muted-foreground">
          Catalog starts empty. Add products from the catalog after the store is active.
        </p>
      );
    case 7:
      return (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={payload.warehouse?.createNew !== false}
              onChange={(e) => onChange('warehouse', { createNew: e.target.checked })}
            />
            Create default warehouse (MAIN)
          </label>
          <label className={labelClass}>
            Warehouse name
            <input
              className={fieldClass}
              value={payload.warehouse?.name ?? 'Main warehouse'}
              onChange={(e) => onChange('warehouse', { name: e.target.value })}
            />
          </label>
        </div>
      );
    case 8:
      return (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={payload.pos?.enabled ?? false}
            onChange={(e) => onChange('pos', { enabled: e.target.checked })}
          />
          Enable POS (receipt template will be provisioned)
        </label>
      );
    case 9:
      return (
        <div className="space-y-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={payload.payment?.acceptsOnlineOrders ?? false}
              onChange={(e) => onChange('payment', { acceptsOnlineOrders: e.target.checked })}
            />
            Accept online orders
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={payload.payment?.codEnabled ?? false}
              onChange={(e) => onChange('payment', { codEnabled: e.target.checked })}
            />
            Cash on delivery (COD)
          </label>
        </div>
      );
    case 10:
      return (
        <label className={labelClass}>
          Shipping model
          <select
            className={fieldClass}
            value={payload.shipping?.model ?? 'vendor_managed'}
            onChange={(e) => onChange('shipping', { model: e.target.value })}
          >
            <option value="store_managed">Store-managed</option>
            <option value="platform_managed">Platform-managed</option>
            <option value="vendor_managed">Vendor-managed</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </label>
      );
    case 11:
      return (
        <div className="space-y-3">
          <label className={labelClass}>
            Tax mode
            <select
              className={fieldClass}
              value={payload.tax?.mode ?? 'exclusive'}
              onChange={(e) =>
                onChange('tax', { mode: e.target.value as 'inclusive' | 'exclusive' })
              }
            >
              <option value="exclusive">Exclusive</option>
              <option value="inclusive">Inclusive</option>
            </select>
          </label>
          <label className={labelClass}>
            Default tax rate (bps)
            <input
              className={fieldClass}
              type="number"
              value={payload.tax?.defaultRateBps ?? 0}
              onChange={(e) => onChange('tax', { defaultRateBps: Number(e.target.value) })}
            />
          </label>
        </div>
      );
    case 12:
      return (
        <div className="space-y-3">
          <label className={labelClass}>
            Site name
            <input
              className={fieldClass}
              value={payload.branding?.siteName ?? payload.basic?.displayName ?? ''}
              onChange={(e) => onChange('branding', { siteName: e.target.value })}
            />
          </label>
          <label className={labelClass}>
            Tagline
            <input
              className={fieldClass}
              value={payload.branding?.tagline ?? ''}
              onChange={(e) => onChange('branding', { tagline: e.target.value })}
            />
          </label>
          <label className={labelClass}>
            Primary color
            <input
              className={fieldClass}
              value={payload.branding?.primaryColor ?? '#0f766e'}
              onChange={(e) => onChange('branding', { primaryColor: e.target.value })}
            />
          </label>
        </div>
      );
    case 13:
      return (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={payload.seo?.enabled !== false}
            onChange={(e) => onChange('seo', { enabled: e.target.checked })}
          />
          Enable default SEO and marketing settings
        </label>
      );
    case 14:
      return (
        <p className="text-sm text-muted-foreground">
          You will be assigned as store manager. Invite additional staff from store settings after
          activation.
        </p>
      );
    case 15:
      return (
        <div className="space-y-2 text-sm">
          {(['email', 'sms', 'push'] as const).map((channel) => (
            <label key={channel} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={payload.notifications?.[channel] ?? channel === 'email'}
                onChange={(e) =>
                  onChange('notifications', { ...payload.notifications, [channel]: e.target.checked })
                }
              />
              {channel.toUpperCase()}
            </label>
          ))}
        </div>
      );
    case 16:
      return (
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Name</dt>
            <dd>{payload.basic?.displayName ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Code</dt>
            <dd>{payload.basic?.storeCode ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Type</dt>
            <dd>{payload.type?.storeType ?? 'online'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Currency</dt>
            <dd>{payload.basic?.currencyCode ?? 'BDT'}</dd>
          </div>
        </dl>
      );
    case 17:
      return (
        <p className="text-sm text-muted-foreground">
          Submit to create the store and run provisioning. This may take a few seconds.
        </p>
      );
    default:
      return null;
  }
}
