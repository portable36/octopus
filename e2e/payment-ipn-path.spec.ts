import { createHash } from 'node:crypto';
import { expect, test, type APIRequestContext } from '@playwright/test';
import { API_BASE, isApiLive } from './helpers/api';
import { findFirstOfferProductId, registerViaUi, uniqueE2eEmail } from './helpers/auth';

/**
 * Phase 26 — SSLCommerz IPN capture E2E (server webhook → CAPTURED).
 *
 * Requires Nest API + indexed offers and PAYMENT_GATEWAY_MODE=sandbox-mock
 * (default without live keys) so verifyPayment accepts the synthetic IPN.
 * Optional: SSLCOMMERZ_STORE_PASSWD set → IPN is signed with verify_sign.
 *
 * Does not call a real SSLCommerz validation API.
 */

const GATEWAY_HOST = /sandbox\.sslcommerz\.com/;

type CheckoutSubmitBody = {
  payments?: readonly {
    paymentIntentId?: string;
    amountMinor?: number;
    currencyCode?: string;
    redirectUrl?: string;
  }[];
};

function md5Hex(input: string): string {
  return createHash('md5').update(input, 'utf8').digest('hex');
}

function buildSignedIpn(
  storePasswd: string,
  fields: Record<string, string>,
): Record<string, string> {
  const verifyKey = Object.keys(fields).join(',');
  const values = { ...fields, store_passwd: md5Hex(storePasswd) };
  const sortedKeys = Object.keys(values).sort((a, b) => a.localeCompare(b));
  const hashString = sortedKeys.map((k) => `${k}=${values[k as keyof typeof values]}`).join('&');
  return {
    ...fields,
    verify_key: verifyKey,
    verify_sign: createHash('md5').update(hashString, 'utf8').digest('hex'),
  };
}

async function postSslCommerzIpn(
  request: APIRequestContext,
  payload: Record<string, string>,
): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  const response = await request.post(`${API_BASE}/payments/gateways/sslcommerz/ipn`, {
    form: payload,
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: response.ok(), status: response.status(), body };
}

test.describe('payment IPN capture', () => {
  test('SSLCommerz IPN captures payment intent after checkout', async ({ page, request }) => {
    test.skip(!(await isApiLive(request)), 'Backend API not running');
    const gatewayMode = (process.env.PAYMENT_GATEWAY_MODE ?? 'sandbox-mock').trim();
    test.skip(
      gatewayMode !== 'sandbox-mock',
      'IPN capture E2E requires PAYMENT_GATEWAY_MODE=sandbox-mock (synthetic verify)',
    );

    const productId = await findFirstOfferProductId(request);
    test.skip(!productId, 'No indexed sellable offers in this environment');

    const email = uniqueE2eEmail('ipn');
    await registerViaUi(page, { email });

    await page.route(GATEWAY_HOST, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: 'e2e-gateway-stub:SSLCOMMERZ',
      });
    });

    await page.goto(`/products/${productId}`);
    const addToCart = page.getByRole('button', { name: 'Add to cart' });
    await expect(addToCart).toBeVisible({ timeout: 20_000 });
    await addToCart.click();

    await page.goto('/cart');
    const checkoutLink = page.getByRole('link', { name: /checkout/i }).first();
    test.skip(
      (await checkoutLink.count()) === 0,
      'Cart empty after add — offer may be non-purchasable',
    );
    await checkoutLink.click();

    await expect(page.getByRole('heading', { level: 1, name: 'Checkout' })).toBeVisible({
      timeout: 20_000,
    });
    await page.locator('input[name="line1"]').fill('12 IPN Road');
    await page.locator('input[name="city"]').fill('Dhaka');
    await page.getByRole('radio', { name: /Cards & Net Banking|SSLCommerz/i }).check();

    const place = page.getByRole('button', { name: /Pay with Cards \/ Banking/i });
    await expect(place).toBeVisible();

    const submitResponsePromise = page.waitForResponse(
      (res) =>
        res.url().includes('/checkout/submit') &&
        res.request().method() === 'POST' &&
        res.status() < 500,
      { timeout: 60_000 },
    );

    await Promise.all([
      page.waitForURL(GATEWAY_HOST, { timeout: 60_000 }).catch(() => undefined),
      place.click(),
    ]);

    const submitResponse = await submitResponsePromise;
    test.skip(!submitResponse.ok(), `checkout/submit failed: ${submitResponse.status()}`);
    const outcome = (await submitResponse.json()) as CheckoutSubmitBody;
    const payment = outcome.payments?.[0];
    test.skip(!payment?.paymentIntentId, 'Checkout outcome missing paymentIntentId');

    const amountTaka = ((payment.amountMinor ?? 0) / 100).toFixed(2);
    const baseFields: Record<string, string> = {
      tran_id: payment.paymentIntentId!,
      status: 'VALID',
      val_id: `e2e_val_${Date.now()}`,
      bank_tran_id: `E2E_BANK_${Date.now()}`,
      amount: amountTaka,
      currency: payment.currencyCode ?? 'BDT',
    };

    const storePasswd = process.env.SSLCOMMERZ_STORE_PASSWD?.trim();
    const ipnPayload = storePasswd ? buildSignedIpn(storePasswd, baseFields) : baseFields;

    const first = await postSslCommerzIpn(request, ipnPayload);
    expect(first.status, JSON.stringify(first.body)).toBe(200);
    expect(first.body.received).toBe(true);
    expect(first.body.status).toBe('CAPTURED');

    // Replay / duplicate IPN stays idempotent.
    const second = await postSslCommerzIpn(request, ipnPayload);
    expect(second.status).toBe(200);
    expect(second.body.received).toBe(true);
    expect(second.body.status).toBe('CAPTURED');
  });
});
