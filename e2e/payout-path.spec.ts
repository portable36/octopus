import { expect, test } from '@playwright/test';
import { isApiLive } from './helpers/api';
import {
  E2E_PASSWORD,
  collectCodViaApi,
  fetchVendorFinanceSummary,
  findFirstOfferProductId,
  loginViaApi,
  loginViaUi,
  registerViaUi,
  uniqueE2eEmail,
} from './helpers/auth';

/**
 * Phase 26 — vendor payout request E2E.
 * Needs spendable ledger balance (seeded env, or COD collect + outbox worker).
 *
 * Set:
 *   E2E_VENDOR_EMAIL
 *   E2E_VENDOR_PASSWORD (optional; defaults to E2E_PASSWORD)
 *   E2E_VENDOR_ID (optional; otherwise /vendor auto-redirects)
 *   E2E_STORE_ID (optional; pins vendor shell store)
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

type StashedCheckout = {
  payments?: readonly {
    paymentIntentId?: string;
    amountMinor?: number;
    currencyCode?: string;
  }[];
};

async function resolveVendorId(
  page: import('@playwright/test').Page,
  preferred: string | null,
): Promise<string | null> {
  if (preferred) return preferred;
  await page.goto('/vendor');
  await page.waitForURL(/\/vendor\/[^/]+/, { timeout: 30_000 });
  return page.url().match(/\/vendor\/([^/]+)/)?.[1] ?? null;
}

async function waitForSpendable(
  request: import('@playwright/test').APIRequestContext,
  input: { accessToken: string; vendorId: string },
  opts: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<{ spendableMinor: number; currencyCode: string } | null> {
  const timeoutMs = opts.timeoutMs ?? 45_000;
  const intervalMs = opts.intervalMs ?? 2_000;
  const deadline = Date.now() + timeoutMs;
  let last: { spendableMinor: number; currencyCode: string } | null = null;
  while (Date.now() < deadline) {
    last = await fetchVendorFinanceSummary(request, input);
    if (last && last.spendableMinor > 0) {
      return last;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return last;
}

test.describe('vendor payout', () => {
  test('vendor finance page requests payout when spendable', async ({
    page,
    browser,
    request,
  }) => {
    test.skip(!(await isApiLive(request)), 'Backend API not running');
    const vendor = vendorCreds();
    test.skip(!vendor, 'Set E2E_VENDOR_EMAIL (and optional E2E_VENDOR_PASSWORD / E2E_VENDOR_ID)');

    const vendorToken = await loginViaApi(request, vendor);
    test.skip(!vendorToken, 'Vendor API login failed (check creds / MFA)');

    if (vendor.storeId) {
      await page.addInitScript((storeId) => {
        window.localStorage.setItem('octopus.vendor.selectedStoreId', storeId);
      }, vendor.storeId);
    }
    await loginViaUi(page, { email: vendor.email, password: vendor.password });

    const vendorId = await resolveVendorId(page, vendor.vendorId);
    test.skip(!vendorId, 'Vendor picker did not resolve a vendor id');

    let summary = await fetchVendorFinanceSummary(request, {
      accessToken: vendorToken,
      vendorId: vendorId!,
    });
    test.skip(!summary, 'Could not load vendor finance summary');

    if (summary!.spendableMinor <= 0) {
      const productId = await findFirstOfferProductId(request);
      test.skip(!productId, 'No spendable balance and no indexed offers to seed via COD');

      const customerContext = await browser.newContext();
      const customerPage = await customerContext.newPage();
      const email = uniqueE2eEmail('payout');
      await registerViaUi(customerPage, { email });

      await customerPage.goto(`/products/${productId}`);
      const addToCart = customerPage.getByRole('button', { name: 'Add to cart' });
      await expect(addToCart).toBeVisible({ timeout: 20_000 });
      await addToCart.click();

      await customerPage.goto('/cart');
      const checkoutLink = customerPage.getByRole('link', { name: /checkout/i }).first();
      test.skip(
        (await checkoutLink.count()) === 0,
        'Cart empty after add — offer may be non-purchasable',
      );
      await checkoutLink.click();

      await expect(customerPage.getByRole('heading', { level: 1, name: 'Checkout' })).toBeVisible({
        timeout: 20_000,
      });
      await customerPage.locator('input[name="line1"]').fill('12 Payout Road');
      await customerPage.locator('input[name="city"]').fill('Dhaka');
      await customerPage.getByRole('radio', { name: /Cash on delivery/i }).check();
      await customerPage.getByRole('button', { name: /Place COD order|Place order/i }).click();
      await expect(customerPage).toHaveURL(/\/checkout\/success/, { timeout: 45_000 });

      const outcome = await customerPage.evaluate((): StashedCheckout | null => {
        const raw = window.sessionStorage.getItem('octopus.checkoutOutcome');
        if (!raw) return null;
        try {
          return JSON.parse(raw) as StashedCheckout;
        } catch {
          return null;
        }
      });
      const payment = outcome?.payments?.[0];
      test.skip(
        !payment?.paymentIntentId ||
          payment.amountMinor === undefined ||
          !payment.currencyCode,
        'Checkout outcome missing payment for COD collect',
      );

      const collected = await collectCodViaApi(request, {
        accessToken: vendorToken,
        paymentIntentId: payment.paymentIntentId!,
        amountMinor: payment.amountMinor!,
        currencyCode: payment.currencyCode!,
      });
      test.skip(!collected, 'COD collect failed — vendor may lack scope for this store');
      await customerContext.close();

      summary = await waitForSpendable(request, {
        accessToken: vendorToken,
        vendorId: vendorId!,
      });
      test.skip(
        !summary || summary.spendableMinor <= 0,
        'No spendable balance after COD collect (ledger worker may be down)',
      );
    }

    await page.goto(`/vendor/${vendorId}/finance`);
    await expect(page.getByRole('heading', { level: 2, name: 'Finance' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/Select a store in the header/i)).toHaveCount(0, {
      timeout: 20_000,
    });

    const amountMinor = Math.min(summary!.spendableMinor, 100);
    const amountMajor = (amountMinor / 100).toFixed(2);
    await page.locator('input[name="amountMajor"]').fill(amountMajor);
    await page.locator('input[name="currencyCode"]').fill(summary!.currencyCode);
    await page.getByRole('button', { name: 'Request payout' }).click();

    await expect(page.getByText('Payout requested.')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/REQUESTED|APPROVED|PROCESSING|COMPLETED/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
