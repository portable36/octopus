import { expect, test } from '@playwright/test';
import { isApiLive } from './helpers/api';
import { findFirstOfferProductId, registerViaUi, uniqueE2eEmail } from './helpers/auth';

/**
 * Phase 26 — payment gateway redirect E2E.
 * With PAYMENT_GATEWAY_MODE=sandbox-mock (default without live keys), Nest returns
 * sandbox redirect URLs for bKash / SSLCommerz / Nagad. This smoke asserts checkout
 * navigates to that URL — it does not complete a live provider payment.
 *
 * Optional: E2E_PAYMENT_METHOD=BKASH|SSLCOMMERZ|NAGAD (default BKASH)
 */
const GATEWAY_HOST =
  /tokenized\.sandbox\.bka\.sh|sandbox\.sslcommerz\.com|sandbox\.mynagad\.com/;

function selectedMethod(): 'BKASH' | 'SSLCOMMERZ' | 'NAGAD' {
  const raw = (process.env.E2E_PAYMENT_METHOD ?? 'BKASH').trim().toUpperCase();
  if (raw === 'SSLCOMMERZ' || raw === 'NAGAD' || raw === 'BKASH') {
    return raw;
  }
  return 'BKASH';
}

function methodRadioName(method: 'BKASH' | 'SSLCOMMERZ' | 'NAGAD'): RegExp {
  if (method === 'SSLCOMMERZ') return /Cards & Net Banking|SSLCommerz/i;
  if (method === 'NAGAD') return /^Nagad$/i;
  return /^bKash$/i;
}

function placeButtonName(method: 'BKASH' | 'SSLCOMMERZ' | 'NAGAD'): RegExp {
  if (method === 'SSLCOMMERZ') return /Pay with Cards \/ Banking/i;
  if (method === 'NAGAD') return /Pay with Nagad/i;
  return /Pay with bKash/i;
}

test.describe('payment gateway redirect', () => {
  test('checkout redirects to provider sandbox URL', async ({ page, request }) => {
    test.skip(!(await isApiLive(request)), 'Backend API not running');

    const productId = await findFirstOfferProductId(request);
    test.skip(!productId, 'No indexed sellable offers in this environment');

    const method = selectedMethod();
    const email = uniqueE2eEmail('pay');
    await registerViaUi(page, { email });

    // Don't depend on live sandbox DNS — fulfill once navigated.
    await page.route(GATEWAY_HOST, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: `e2e-gateway-stub:${method}`,
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
    await page.locator('input[name="line1"]').fill('12 Payment Road');
    await page.locator('input[name="city"]').fill('Dhaka');
    await page.getByRole('radio', { name: methodRadioName(method) }).check();

    const place = page.getByRole('button', { name: placeButtonName(method) });
    await expect(place).toBeVisible();

    await Promise.all([
      page.waitForURL(GATEWAY_HOST, { timeout: 60_000 }),
      place.click(),
    ]);

    expect(page.url()).toMatch(GATEWAY_HOST);
    await expect(page.getByText(`e2e-gateway-stub:${method}`)).toBeVisible({ timeout: 10_000 });
  });
});
