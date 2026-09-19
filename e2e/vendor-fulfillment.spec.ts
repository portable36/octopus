import { expect, test } from '@playwright/test';
import { isApiLive } from './helpers/api';
import {
  E2E_PASSWORD,
  findFirstOfferProductId,
  loginViaUi,
  registerViaUi,
  uniqueE2eEmail,
} from './helpers/auth';

/**
 * Phase 26 — vendor fulfillment E2E.
 * Needs Nest API, sellable offers, and a vendor staff account that can see the
 * store that owns the offer (same environment seed).
 *
 * Set:
 *   E2E_VENDOR_EMAIL
 *   E2E_VENDOR_PASSWORD (optional; defaults to E2E_PASSWORD)
 *   E2E_VENDOR_ID (optional; otherwise /vendor auto-redirects for single membership)
 *   E2E_STORE_ID (optional; pins vendor shell store when the account has many stores)
 */
function vendorCreds(): {
  email: string;
  password: string;
  vendorId: string | null;
  storeId: string | null;
} | null {
  const email = process.env.E2E_VENDOR_EMAIL?.trim();
  if (!email) return null;
  return {
    email,
    password: process.env.E2E_VENDOR_PASSWORD?.trim() || E2E_PASSWORD,
    vendorId: process.env.E2E_VENDOR_ID?.trim() || null,
    storeId: process.env.E2E_STORE_ID?.trim() || null,
  };
}

test.describe('vendor fulfillment', () => {
  test('customer COD order then vendor fulfill + MANUAL shipment', async ({
    page,
    browser,
    request,
  }) => {
    test.skip(!(await isApiLive(request)), 'Backend API not running');
    const vendor = vendorCreds();
    test.skip(!vendor, 'Set E2E_VENDOR_EMAIL (and optional E2E_VENDOR_PASSWORD / E2E_VENDOR_ID)');

    const productId = await findFirstOfferProductId(request);
    test.skip(!productId, 'No indexed sellable offers in this environment');

    const email = uniqueE2eEmail('fulfill');
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
    await page.locator('input[name="line1"]').fill('12 Fulfill Road');
    await page.locator('input[name="city"]').fill('Dhaka');
    await page.getByRole('radio', { name: /Cash on delivery/i }).check();
    await page.getByRole('button', { name: /Place COD order|Place order/i }).click();
    await expect(page).toHaveURL(/\/checkout\/success/, { timeout: 45_000 });

    const orderNumber = (
      await page.locator('section[aria-labelledby="orders"] li p.font-medium').first().textContent()
    )?.trim();
    test.skip(!orderNumber, 'Success page did not show order number');

    const vendorContext = await browser.newContext();
    const vendorPage = await vendorContext.newPage();
    if (vendor.storeId) {
      await vendorPage.addInitScript((storeId) => {
        window.localStorage.setItem('octopus.vendor.selectedStoreId', storeId);
      }, vendor.storeId);
    }
    await loginViaUi(vendorPage, { email: vendor.email, password: vendor.password });

    if (vendor.vendorId) {
      await vendorPage.goto(`/vendor/${vendor.vendorId}/orders`);
    } else {
      await vendorPage.goto('/vendor');
      await vendorPage.waitForURL(/\/vendor\/[^/]+/, { timeout: 30_000 });
      const match = vendorPage.url().match(/\/vendor\/([^/]+)/);
      const vendorId = match?.[1];
      test.skip(!vendorId, 'Vendor picker did not resolve a vendor id');
      await vendorPage.goto(`/vendor/${vendorId}/orders`);
    }

    await expect(vendorPage.getByRole('heading', { level: 2, name: /^Orders$/ })).toBeVisible({
      timeout: 20_000,
    });
    await expect(vendorPage.getByText(/Select a store in the header/i)).toHaveCount(0, {
      timeout: 20_000,
    });

    const orderLink = vendorPage.getByRole('link', { name: orderNumber!, exact: true }).first();
    await expect(orderLink).toBeVisible({ timeout: 30_000 });
    await orderLink.click();

    await expect(vendorPage.getByRole('heading', { level: 2, name: orderNumber! })).toBeVisible({
      timeout: 20_000,
    });

    await vendorPage.getByRole('button', { name: 'Start processing' }).click();
    await expect(vendorPage.getByText('Processing started.')).toBeVisible({ timeout: 15_000 });

    await vendorPage.getByRole('button', { name: 'Fulfill' }).first().click();
    await expect(vendorPage.getByText(/Fulfilled \d+ on line/i)).toBeVisible({ timeout: 15_000 });

    await vendorPage.locator('select[name="provider"]').selectOption('MANUAL');
    await vendorPage.locator('input[name="recipientName"]').fill('E2E Recipient');
    await vendorPage.locator('input[name="recipientPhone"]').fill('01712345678');
    await vendorPage.locator('input[name="recipientAddress"]').fill('12 Fulfill Road, Dhaka');
    await vendorPage.getByRole('button', { name: 'Create shipment' }).click();

    await expect(vendorPage.getByText(/Shipment .* created\.|Last shipment/i)).toBeVisible({
      timeout: 30_000,
    });

    await vendorContext.close();
  });
});
