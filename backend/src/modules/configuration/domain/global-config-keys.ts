/** Platform-wide global configuration groups and keys (admin-managed). */
export const GLOBAL_CONFIG_GROUPS = {
  CATALOG: 'catalog',
  CHECKOUT: 'checkout',
  SHIPPING: 'shipping',
  PAYMENTS: 'payments',
} as const;

export type GlobalConfigGroup =
  (typeof GLOBAL_CONFIG_GROUPS)[keyof typeof GLOBAL_CONFIG_GROUPS];

export const GLOBAL_CONFIG_KEYS = {
  catalog: {
    DEFAULT_CURRENCY_CODE: 'default_currency_code',
    HIDE_OUT_OF_STOCK: 'hide_out_of_stock',
    LOW_STOCK_THRESHOLD: 'low_stock_threshold',
  },
  checkout: {
    MINIMUM_ORDER_MINOR: 'minimum_order_minor',
    GUEST_CHECKOUT_ENABLED: 'guest_checkout_enabled',
    TAX_COMPUTATION_ENABLED: 'tax_computation_enabled',
    TAX_RATE_BPS: 'tax_rate_bps',
  },
  shipping: {
    FREE_SHIPPING_THRESHOLD_MINOR: 'free_shipping_threshold_minor',
  },
  payments: {
    STRIPE_ENABLED: 'stripe_enabled',
    ADYEN_ENABLED: 'adyen_enabled',
    COD_ENABLED: 'cod_enabled',
  },
} as const;

export const GLOBAL_CONFIG_DEFAULTS: Record<string, Record<string, unknown>> = {
  [GLOBAL_CONFIG_GROUPS.CATALOG]: {
    [GLOBAL_CONFIG_KEYS.catalog.DEFAULT_CURRENCY_CODE]: 'BDT',
    [GLOBAL_CONFIG_KEYS.catalog.HIDE_OUT_OF_STOCK]: false,
    [GLOBAL_CONFIG_KEYS.catalog.LOW_STOCK_THRESHOLD]: 5,
  },
  [GLOBAL_CONFIG_GROUPS.CHECKOUT]: {
    [GLOBAL_CONFIG_KEYS.checkout.MINIMUM_ORDER_MINOR]: 0,
    [GLOBAL_CONFIG_KEYS.checkout.GUEST_CHECKOUT_ENABLED]: true,
    [GLOBAL_CONFIG_KEYS.checkout.TAX_COMPUTATION_ENABLED]: false,
    [GLOBAL_CONFIG_KEYS.checkout.TAX_RATE_BPS]: 0,
  },
  [GLOBAL_CONFIG_GROUPS.SHIPPING]: {
    [GLOBAL_CONFIG_KEYS.shipping.FREE_SHIPPING_THRESHOLD_MINOR]: 0,
  },
  [GLOBAL_CONFIG_GROUPS.PAYMENTS]: {
    [GLOBAL_CONFIG_KEYS.payments.STRIPE_ENABLED]: false,
    [GLOBAL_CONFIG_KEYS.payments.ADYEN_ENABLED]: false,
    [GLOBAL_CONFIG_KEYS.payments.COD_ENABLED]: true,
  },
};

const ALLOWED: Record<string, ReadonlySet<string>> = Object.fromEntries(
  Object.entries(GLOBAL_CONFIG_KEYS).map(([group, keys]) => [
    group,
    new Set(Object.values(keys)),
  ]),
);

export function isAllowedGlobalConfigKey(group: string, key: string): boolean {
  return ALLOWED[group]?.has(key) ?? false;
}

export function resolveGlobalConfigDefault(group: string, key: string): unknown | undefined {
  return GLOBAL_CONFIG_DEFAULTS[group]?.[key];
}
