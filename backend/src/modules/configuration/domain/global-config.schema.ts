import { z } from 'zod';
import { GLOBAL_CONFIG_KEYS } from './global-config-keys';

const catalogSchemas: Record<string, z.ZodType<unknown>> = {
  [GLOBAL_CONFIG_KEYS.catalog.DEFAULT_CURRENCY_CODE]: z
    .string()
    .trim()
    .length(3)
    .transform((v) => v.toUpperCase()),
  [GLOBAL_CONFIG_KEYS.catalog.HIDE_OUT_OF_STOCK]: z.boolean(),
  [GLOBAL_CONFIG_KEYS.catalog.LOW_STOCK_THRESHOLD]: z.number().int().min(0),
};

const checkoutSchemas: Record<string, z.ZodType<unknown>> = {
  [GLOBAL_CONFIG_KEYS.checkout.MINIMUM_ORDER_MINOR]: z.number().int().min(0),
  [GLOBAL_CONFIG_KEYS.checkout.GUEST_CHECKOUT_ENABLED]: z.boolean(),
  [GLOBAL_CONFIG_KEYS.checkout.TAX_COMPUTATION_ENABLED]: z.boolean(),
  [GLOBAL_CONFIG_KEYS.checkout.TAX_RATE_BPS]: z.number().int().min(0).max(10_000),
};

const shippingSchemas: Record<string, z.ZodType<unknown>> = {
  [GLOBAL_CONFIG_KEYS.shipping.FREE_SHIPPING_THRESHOLD_MINOR]: z.number().int().min(0),
};

const paymentsSchemas: Record<string, z.ZodType<unknown>> = {
  [GLOBAL_CONFIG_KEYS.payments.STRIPE_ENABLED]: z.boolean(),
  [GLOBAL_CONFIG_KEYS.payments.ADYEN_ENABLED]: z.boolean(),
  [GLOBAL_CONFIG_KEYS.payments.COD_ENABLED]: z.boolean(),
};

const SCHEMAS_BY_GROUP: Record<string, Record<string, z.ZodType<unknown>>> = {
  catalog: catalogSchemas,
  checkout: checkoutSchemas,
  shipping: shippingSchemas,
  payments: paymentsSchemas,
};

export function parseGlobalConfigValue(group: string, key: string, value: unknown): unknown {
  const schema = SCHEMAS_BY_GROUP[group]?.[key];
  if (!schema) {
    throw new Error(`Unsupported global config key: ${group}.${key}`);
  }
  return schema.parse(value);
}
