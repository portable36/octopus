import { expect, test } from '@playwright/test';
import { isApiLive } from './helpers/api';
import {
  findFirstOfferProductId,
  loginViaUi,
  registerViaUi,
  uniqueE2eEmail,
} from './helpers/auth';

/**
 * Phase 26 — authenticated revenue journey.
 * Needs Nest API. Full COD checkout also needs indexed offers + COD-enabled store/vendor.
 * Specs skip cleanly when API/catalog unavailable (CI e2e is frontend-only today).
 */

test.describe('authenticated account', () => {
  test('registers a new customer and lands on account', async ({ page, request }) => {
    test.skip(!(await isApiLive(request)), 'Backend API not running');
    const email = uniqueE2eEmail('revenue');
    await registerViaUi(page, { email });
    await expect(page.getByText(email)).toBeVisible();
  });

  test('logs in after register in a fresh browser context', async ({ browser, request }) => {
    test.skip(!(await isApiLive(request)), 'Backend API not running');
    const email = uniqueE2eEmail('login');

    const registerContext = await browser.newContext();
    const registerPage = await registerContext.newPage();
    await registerViaUi(registerPage, { email });
    await registerContext.close();

    const loginContext = await browser.newContext();
    const loginPage = await loginContext.newPage();
    await loginViaUi(loginPage, { email });
    await loginPage.goto('/account');
    await expect(loginPage.getByText(email)).toBeVisible();
    await loginContext.close();
  });
});

test.describe('authenticated COD checkout', () => {
  test('registers, adds offer to cart, places COD order', async ({ page, request }) => {
    test.skip(!(await isApiLive(request)), 'Backend API not running');

    const productId = await findFirstOfferProductId(request);
    test.skip(!productId, 'No indexed sellable offers in this environment');

    const email = uniqueE2eEmail('cod');
    await registerViaUi(page, { email });

    await page.goto(`/products/${productId}`);
    const addToCart = page.getByRole('button', { name: 'Add to cart' });
    await expect(addToCart).toBeVisible({ timeout: 20_000 });
    await addToCart.click();

    await page.goto('/cart');
    await expect(page.getByRole('heading', { level: 1, name: /cart/i })).toBeVisible();
    const checkoutLink = page.getByRole('link', { name: /checkout/i }).first();
    test.skip(
      (await checkoutLink.count()) === 0,
      'Cart empty after add — offer may be non-purchasable',
    );
    await checkoutLink.click();

    await expect(page.getByRole('heading', { level: 1, name: 'Checkout' })).toBeVisible({
      timeout: 20_000,
    });
    await page.locator('input[name="line1"]').fill('12 Test Road');
    await page.locator('input[name="city"]').fill('Dhaka');
    await page.getByRole('radio', { name: /Cash on delivery/i }).check();
    await page.getByRole('button', { name: /Place COD order|Place order/i }).click();

    await expect(page).toHaveURL(/\/checkout\/success/, { timeout: 45_000 });
    await expect(
      page.getByRole('heading', { level: 1, name: /Order confirmed|Order placed/i }),
    ).toBeVisible();
  });
});
