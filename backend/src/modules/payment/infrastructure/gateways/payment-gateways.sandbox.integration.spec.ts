import { describe, expect, it } from 'vitest';
import { PaymentIntent } from '../../domain/aggregates/payment-intent.aggregate';
import { SslCommerzGatewayAdapter } from './sslcommerz-gateway.adapter';
import { BkashGatewayAdapter } from './bkash-gateway.adapter';

/**
 * Optional live sandbox network probes (Phase 26.11).
 * Skipped unless provider credentials are present and PAYMENT_GATEWAY_MODE is not sandbox-mock.
 *
 * SSLCommerz: SSLCOMMERZ_STORE_ID + SSLCOMMERZ_STORE_PASSWD
 * bKash: BKASH_APP_KEY + BKASH_APP_SECRET + BKASH_USERNAME + BKASH_PASSWORD
 */
const mode = (process.env.PAYMENT_GATEWAY_MODE ?? 'sandbox-mock').trim();
const allowNetwork = mode === 'sandbox' || mode === 'live';

const hasSsl =
  allowNetwork &&
  Boolean(process.env.SSLCOMMERZ_STORE_ID?.trim()) &&
  Boolean(process.env.SSLCOMMERZ_STORE_PASSWD?.trim());

const hasBkash =
  allowNetwork &&
  Boolean(process.env.BKASH_APP_KEY?.trim()) &&
  Boolean(process.env.BKASH_APP_SECRET?.trim()) &&
  Boolean(process.env.BKASH_USERNAME?.trim()) &&
  Boolean(process.env.BKASH_PASSWORD?.trim());

function intent(method: 'SSLCOMMERZ' | 'BKASH') {
  return PaymentIntent.create({
    checkoutId: 'c1d88bb4-0000-4000-8000-000000000011',
    orderId: 'c1d88bb4-0000-4000-8000-000000000012',
    vendorId: 'c1d88bb4-0000-4000-8000-000000000013',
    storeId: 'c1d88bb4-0000-4000-8000-000000000014',
    customerId: 'c1d88bb4-0000-4000-8000-000000000015',
    paymentMethod: method,
    amountMinor: 10000,
    currencyCode: 'BDT',
  });
}

describe.runIf(hasSsl)('SslCommerz sandbox network session', () => {
  it(
    'initializeSession returns a GatewayPageURL from SSLCommerz',
    async () => {
      const adapter = new SslCommerzGatewayAdapter({
        paymentGatewayMode: mode === 'live' ? 'live' : 'sandbox',
        port: 3000,
        sslCommerzStoreId: process.env.SSLCOMMERZ_STORE_ID,
        sslCommerzStorePasswd: process.env.SSLCOMMERZ_STORE_PASSWD,
        sslCommerzIsSandbox: process.env.SSLCOMMERZ_IS_SANDBOX !== 'false',
      } as never);

      const res = await adapter.initializeSession({ paymentIntent: intent('SSLCOMMERZ') });
      expect(res.redirectUrl).toMatch(/^https:\/\//);
      expect(res.gatewayReferenceId).toBeTruthy();
    },
    30_000,
  );
});

describe.runIf(hasBkash)('bKash sandbox network session', () => {
  it(
    'initializeSession returns a bkashURL from tokenized checkout',
    async () => {
      const adapter = new BkashGatewayAdapter({
        paymentGatewayMode: mode === 'live' ? 'live' : 'sandbox',
        port: 3000,
        bkashAppKey: process.env.BKASH_APP_KEY,
        bkashAppSecret: process.env.BKASH_APP_SECRET,
        bkashUsername: process.env.BKASH_USERNAME,
        bkashPassword: process.env.BKASH_PASSWORD,
        bkashIsSandbox: process.env.BKASH_IS_SANDBOX !== 'false',
      } as never);

      const res = await adapter.initializeSession({ paymentIntent: intent('BKASH') });
      expect(res.redirectUrl).toMatch(/^https:\/\//);
      expect(res.gatewayReferenceId).toBeTruthy();
    },
    30_000,
  );
});
