export type GlobalConfigTab = 'seo' | 'marketing' | 'operations';

export type SeoSystemSettingsForm = {
  readonly SEO_SITEMAP_CRON: string;
  readonly SITEMAP_ITEMS_PER_CHUNK: string;
  readonly SEO_CANONICAL_APP_URL: string;
  readonly GOOGLE_SERVICES_CLIENT_EMAIL: string;
  readonly GOOGLE_SERVICES_PRIVATE_KEY: string;
};

export type MarketingSystemSettingsForm = {
  readonly MARKETING_GTM_CONTAINER_ID: string;
  readonly MARKETING_GA4_MEASUREMENT_ID: string;
  readonly GEM_SCHEMA_VERSION: string;
  readonly GEM_TRACKING_ENVIRONMENT: string;
  readonly META_PIXEL_ID: string;
  readonly META_ACCESS_TOKEN: string;
  readonly META_ANDROMEDA_DATA_PROCESSING_OPTIONS: string;
  readonly META_ANDROMEDA_COUNTRY: string;
  readonly META_ANDROMEDA_STATE: string;
  readonly META_CAPI_DATA_SOURCE: string;
};

export type OperationsSettingsForm = {
  readonly default_currency_code: string;
  readonly hide_out_of_stock: boolean;
  readonly low_stock_threshold: string;
  readonly minimum_order_minor: string;
  readonly guest_checkout_enabled: boolean;
  readonly tax_computation_enabled: boolean;
  readonly tax_rate_bps: string;
  readonly free_shipping_threshold_minor: string;
  readonly stripe_enabled: boolean;
  readonly adyen_enabled: boolean;
  readonly cod_enabled: boolean;
};

export const DEFAULT_SEO_SYSTEM_SETTINGS: SeoSystemSettingsForm = {
  SEO_SITEMAP_CRON: '0 2 * * *',
  SITEMAP_ITEMS_PER_CHUNK: '5000',
  SEO_CANONICAL_APP_URL: '',
  GOOGLE_SERVICES_CLIENT_EMAIL: '',
  GOOGLE_SERVICES_PRIVATE_KEY: '',
};

export const DEFAULT_MARKETING_SYSTEM_SETTINGS: MarketingSystemSettingsForm = {
  MARKETING_GTM_CONTAINER_ID: '',
  MARKETING_GA4_MEASUREMENT_ID: '',
  GEM_SCHEMA_VERSION: '2.4.0',
  GEM_TRACKING_ENVIRONMENT: 'production',
  META_PIXEL_ID: '',
  META_ACCESS_TOKEN: '',
  META_ANDROMEDA_DATA_PROCESSING_OPTIONS: '["LDU"]',
  META_ANDROMEDA_COUNTRY: '0',
  META_ANDROMEDA_STATE: '0',
  META_CAPI_DATA_SOURCE: 'server',
};

export const DEFAULT_OPERATIONS_SETTINGS: OperationsSettingsForm = {
  default_currency_code: 'BDT',
  hide_out_of_stock: false,
  low_stock_threshold: '5',
  minimum_order_minor: '0',
  guest_checkout_enabled: true,
  tax_computation_enabled: false,
  tax_rate_bps: '0',
  free_shipping_threshold_minor: '0',
  stripe_enabled: false,
  adyen_enabled: false,
  cod_enabled: true,
};

function asString(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}

export function mapSeoSystemSettingsToForm(
  settings: Record<string, unknown>,
): SeoSystemSettingsForm {
  return {
    SEO_SITEMAP_CRON: asString(settings.SEO_SITEMAP_CRON, DEFAULT_SEO_SYSTEM_SETTINGS.SEO_SITEMAP_CRON),
    SITEMAP_ITEMS_PER_CHUNK: asString(
      settings.SITEMAP_ITEMS_PER_CHUNK,
      DEFAULT_SEO_SYSTEM_SETTINGS.SITEMAP_ITEMS_PER_CHUNK,
    ),
    SEO_CANONICAL_APP_URL: asString(settings.SEO_CANONICAL_APP_URL),
    GOOGLE_SERVICES_CLIENT_EMAIL: asString(settings.GOOGLE_SERVICES_CLIENT_EMAIL),
    GOOGLE_SERVICES_PRIVATE_KEY: asString(settings.GOOGLE_SERVICES_PRIVATE_KEY),
  };
}

export function mapMarketingSystemSettingsToForm(
  settings: Record<string, unknown>,
): MarketingSystemSettingsForm {
  return {
    MARKETING_GTM_CONTAINER_ID: asString(settings.MARKETING_GTM_CONTAINER_ID),
    MARKETING_GA4_MEASUREMENT_ID: asString(settings.MARKETING_GA4_MEASUREMENT_ID),
    GEM_SCHEMA_VERSION: asString(
      settings.GEM_SCHEMA_VERSION,
      DEFAULT_MARKETING_SYSTEM_SETTINGS.GEM_SCHEMA_VERSION,
    ),
    GEM_TRACKING_ENVIRONMENT: asString(
      settings.GEM_TRACKING_ENVIRONMENT,
      DEFAULT_MARKETING_SYSTEM_SETTINGS.GEM_TRACKING_ENVIRONMENT,
    ),
    META_PIXEL_ID: asString(settings.META_PIXEL_ID),
    META_ACCESS_TOKEN: asString(settings.META_ACCESS_TOKEN),
    META_ANDROMEDA_DATA_PROCESSING_OPTIONS: asString(
      settings.META_ANDROMEDA_DATA_PROCESSING_OPTIONS,
      DEFAULT_MARKETING_SYSTEM_SETTINGS.META_ANDROMEDA_DATA_PROCESSING_OPTIONS,
    ),
    META_ANDROMEDA_COUNTRY: asString(
      settings.META_ANDROMEDA_COUNTRY,
      DEFAULT_MARKETING_SYSTEM_SETTINGS.META_ANDROMEDA_COUNTRY,
    ),
    META_ANDROMEDA_STATE: asString(
      settings.META_ANDROMEDA_STATE,
      DEFAULT_MARKETING_SYSTEM_SETTINGS.META_ANDROMEDA_STATE,
    ),
    META_CAPI_DATA_SOURCE: asString(
      settings.META_CAPI_DATA_SOURCE,
      DEFAULT_MARKETING_SYSTEM_SETTINGS.META_CAPI_DATA_SOURCE,
    ),
  };
}

export function mapGlobalConfigToOperationsForm(
  settings: Record<string, Record<string, unknown>>,
): OperationsSettingsForm {
  const catalog = settings.catalog ?? {};
  const checkout = settings.checkout ?? {};
  const shipping = settings.shipping ?? {};
  const payments = settings.payments ?? {};

  return {
    default_currency_code: asString(
      catalog.default_currency_code,
      DEFAULT_OPERATIONS_SETTINGS.default_currency_code,
    ),
    hide_out_of_stock: Boolean(catalog.hide_out_of_stock ?? DEFAULT_OPERATIONS_SETTINGS.hide_out_of_stock),
    low_stock_threshold: asString(
      catalog.low_stock_threshold,
      DEFAULT_OPERATIONS_SETTINGS.low_stock_threshold,
    ),
    minimum_order_minor: asString(
      checkout.minimum_order_minor,
      DEFAULT_OPERATIONS_SETTINGS.minimum_order_minor,
    ),
    guest_checkout_enabled: Boolean(
      checkout.guest_checkout_enabled ?? DEFAULT_OPERATIONS_SETTINGS.guest_checkout_enabled,
    ),
    tax_computation_enabled: Boolean(
      checkout.tax_computation_enabled ?? DEFAULT_OPERATIONS_SETTINGS.tax_computation_enabled,
    ),
    tax_rate_bps: asString(checkout.tax_rate_bps, DEFAULT_OPERATIONS_SETTINGS.tax_rate_bps),
    free_shipping_threshold_minor: asString(
      shipping.free_shipping_threshold_minor,
      DEFAULT_OPERATIONS_SETTINGS.free_shipping_threshold_minor,
    ),
    stripe_enabled: Boolean(payments.stripe_enabled ?? DEFAULT_OPERATIONS_SETTINGS.stripe_enabled),
    adyen_enabled: Boolean(payments.adyen_enabled ?? DEFAULT_OPERATIONS_SETTINGS.adyen_enabled),
    cod_enabled: Boolean(payments.cod_enabled ?? DEFAULT_OPERATIONS_SETTINGS.cod_enabled),
  };
}

export function updateSeoSystemField<K extends keyof SeoSystemSettingsForm>(
  form: SeoSystemSettingsForm,
  key: K,
  value: SeoSystemSettingsForm[K],
): SeoSystemSettingsForm {
  return { ...form, [key]: value };
}

export function updateMarketingSystemField<K extends keyof MarketingSystemSettingsForm>(
  form: MarketingSystemSettingsForm,
  key: K,
  value: MarketingSystemSettingsForm[K],
): MarketingSystemSettingsForm {
  return { ...form, [key]: value };
}

export function updateOperationsField<K extends keyof OperationsSettingsForm>(
  form: OperationsSettingsForm,
  key: K,
  value: OperationsSettingsForm[K],
): OperationsSettingsForm {
  return { ...form, [key]: value };
}

export function seoSystemFormToPatch(form: SeoSystemSettingsForm): Record<string, unknown> {
  return {
    SEO_SITEMAP_CRON: form.SEO_SITEMAP_CRON.trim(),
    SITEMAP_ITEMS_PER_CHUNK: Number(form.SITEMAP_ITEMS_PER_CHUNK),
    SEO_CANONICAL_APP_URL: form.SEO_CANONICAL_APP_URL.trim(),
    GOOGLE_SERVICES_CLIENT_EMAIL: form.GOOGLE_SERVICES_CLIENT_EMAIL.trim(),
    GOOGLE_SERVICES_PRIVATE_KEY: form.GOOGLE_SERVICES_PRIVATE_KEY,
  };
}

export function marketingSystemFormToPatch(
  form: MarketingSystemSettingsForm,
): Record<string, unknown> {
  return {
    MARKETING_GTM_CONTAINER_ID: form.MARKETING_GTM_CONTAINER_ID.trim(),
    MARKETING_GA4_MEASUREMENT_ID: form.MARKETING_GA4_MEASUREMENT_ID.trim(),
    GEM_SCHEMA_VERSION: form.GEM_SCHEMA_VERSION.trim(),
    GEM_TRACKING_ENVIRONMENT: form.GEM_TRACKING_ENVIRONMENT,
    META_PIXEL_ID: form.META_PIXEL_ID.trim(),
    META_ACCESS_TOKEN: form.META_ACCESS_TOKEN,
    META_ANDROMEDA_DATA_PROCESSING_OPTIONS: form.META_ANDROMEDA_DATA_PROCESSING_OPTIONS.trim(),
    META_ANDROMEDA_COUNTRY: Number(form.META_ANDROMEDA_COUNTRY),
    META_ANDROMEDA_STATE: Number(form.META_ANDROMEDA_STATE),
    META_CAPI_DATA_SOURCE: form.META_CAPI_DATA_SOURCE,
  };
}

export function operationsFormToPatch(form: OperationsSettingsForm): Record<string, Record<string, unknown>> {
  return {
    catalog: {
      default_currency_code: form.default_currency_code.trim().toUpperCase(),
      hide_out_of_stock: form.hide_out_of_stock,
      low_stock_threshold: Number(form.low_stock_threshold),
    },
    checkout: {
      minimum_order_minor: Number(form.minimum_order_minor),
      guest_checkout_enabled: form.guest_checkout_enabled,
      tax_computation_enabled: form.tax_computation_enabled,
      tax_rate_bps: Number(form.tax_rate_bps),
    },
    shipping: {
      free_shipping_threshold_minor: Number(form.free_shipping_threshold_minor),
    },
    payments: {
      stripe_enabled: form.stripe_enabled,
      adyen_enabled: form.adyen_enabled,
      cod_enabled: form.cod_enabled,
    },
  };
}
