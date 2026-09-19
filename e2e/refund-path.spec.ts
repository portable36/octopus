import { expect, test } from '@playwright/test';
import { isApiLive } from './helpers/api';
import {
  E2E_PASSWORD,
  collectCodViaApi,
  findFirstOfferProductId,
  loginViaApi,
  registerViaUi,
  uniqueE2eEmail,
} from './helpers/auth';

/**
 * Phase 26 — customer refund request E2E.
 * COD orders stay PENDING_PAYMENT until staff collects cash; refund UI only
 * appears once payment is PAID.
 *
 * Set:
 *   E2E_VENDOR_EMAIL   (staff that can collect COD for the offer’s store)
 *   E2E_VENDOR_PASSWORD (optional; defaults to E2E_PASSWORD)
 */
function vendorCreds(): { email: string; password: string } | null {
  const email = process.env.E2E_VENDOR_EMAIL?.trim();
  if (!email) return null;
  return {
    email,
    password: process.env.E2E_VENDOR_PASSWORD?.trim() || E2E_PASSWORD,
  };
}

type StashedCheckout = {
  orders?: readonly { orderId?: string; orderNumber?: string }[];
  payments?: readonly {
    paymentIntentId?: string;
    amountMinor?: number;
    currencyCode?: string;
  }[];
};

test.describe('customer refund request', () => {
  test('COD collect then customer Request refund', async ({ page, request }) => {
    test.skip(!(await isApiLive(request)), 'Backend API not running');
    const vendor = vendorCreds();
    test.skip(!vendor, 'Set E2E_VENDOR_EMAIL (and optional E2E_VENDOR_PASSWORD)');

    const productId = await findFirstOfferProductId(request);
    test.skip(!productId, 'No indexed sellable offers in this environment');

    const email = uniqueE2eEmail('refund');
    await registerViaUi(page, { email });

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
    await page.locator('input[name="line1"]').fill('12 Refund Road');
    await page.locator('input[name="city"]').fill('Dhaka');
    await page.getByRole('radio', { name: /Cash on delivery/i }).check();
    await page.getByRole('button', { name: /Place COD order|Place order/i }).click();
    await expect(page).toHaveURL(/\/checkout\/success/, { timeout: 45_000 });

    const outcome = await page.evaluate((): StashedCheckout | null => {
      const raw = window.sessionStorage.getItem('octopus.checkoutOutcome');
      if (!raw) return null;
      try {
        return JSON.parse(raw) as StashedCheckout;
      } catch {
        return null;
      }
    });
    const orderId = outcome?.orders?.[0]?.orderId;
    const payment = outcome?.payments?.[0];
    test.skip(!orderId || !payment?.paymentIntentId, 'Checkout outcome missing order/payment ids');
    test.skip(
      payment.amountMinor === undefined || !payment.currencyCode,
      'Checkout outcome missing payment amount',
    );

    const vendorToken = await loginViaApi(request, vendor);
    test.skip(!vendorToken, 'Vendor API login failed (check creds / MFA)');

    const collected = await collectCodViaApi(request, {
      accessToken: vendorToken,
      paymentIntentId: payment.paymentIntentId!,
      amountMinor: payment.amountMinor!,
      currencyCode: payment.currencyCode!,
    });
    test.skip(!collected, 'COD collect failed — vendor may lack scope for this store');

    await page.goto(`/account/orders/${orderId}`);
    await expect(page.getByRole('heading', { level: 2, name: /Payment \/ refund status/i })).toBeVisible({
      timeout: 20_000,
    });

    const refundBtn = page.getByRole('button', { name: 'Request refund' });
    await expect(refundBtn).toBeVisible({ timeout: 20_000 });
    await refundBtn.click();

    await expect(page.getByText(/refund requested/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/REFUND_REQUESTED/i).first()).toBeVisible();
  });
});
