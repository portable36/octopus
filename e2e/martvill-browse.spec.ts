import { expect, test } from '@playwright/test';
import { API_BASE, isApiLive } from './helpers/api';

/**
 * Martvill storefront browse continuity — quick view, vendor shop, store PLP.
 * Data-dependent tests skip when Meilisearch/catalog has no published offers.
 * SSR shop/store pages require the Nest API — 404 tests skip when it is down.
 */

test.describe('quick view', () => {
  test('opens and closes from search results when offers exist', async ({ page }) => {
    await page.goto('/search');
    await expect(page.getByRole('heading', { level: 1, name: /search/i })).toBeVisible();

    const quickView = page.getByRole('button', { name: 'Quick view' }).first();
    const offerCount = await quickView.count();
    test.skip(offerCount === 0, 'No indexed offers in this environment');

    await quickView.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Quick view')).toBeVisible();
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).toBeHidden();
  });
});

test.describe('vendor shop', () => {
  test('unknown shop slug shows storefront not found', async ({ page, request }) => {
    test.skip(!(await isApiLive(request)), 'Backend API not running');
    await page.goto('/shops/does-not-exist-vendor-shop');
    await expect(page.getByRole('heading', { level: 1, name: 'Not found' })).toBeVisible();
  });
});

test.describe('store browse', () => {
  test('unknown store slug shows storefront not found', async ({ page, request }) => {
    test.skip(!(await isApiLive(request)), 'Backend API not running');
    await page.goto('/stores/does-not-exist-store-slug');
    await expect(page.getByRole('heading', { level: 1, name: 'Not found' })).toBeVisible();
  });

  test('uses browse grid layout shell when store exists', async ({ page, request }) => {
    test.skip(!(await isApiLive(request)), 'Backend API not running');
    const response = await request.get(`${API_BASE}/public/stores/by-slug/demo-store`).catch(() => null);
    test.skip(!response?.ok(), 'No demo store in this environment');

    const store = (await response!.json()) as { slug: string };
    await page.goto(`/stores/${store.slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: /offers in this store/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Quick view' }).first()).toBeVisible();
  });
});

test.describe('vendor shop browse', () => {
  test('uses browse grid when active vendor exists', async ({ page, request }) => {
    test.skip(!(await isApiLive(request)), 'Backend API not running');
    const response = await request.get(`${API_BASE}/public/vendors/by-slug/demo-vendor`).catch(() => null);
    test.skip(!response?.ok(), 'No demo vendor in this environment');

    const vendor = (await response!.json()) as { slug: string; displayName: string };
    await page.goto(`/shops/${vendor.slug}`);
    await expect(page.getByRole('heading', { level: 1, name: vendor.displayName })).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 2, name: /offers from this vendor/i }),
    ).toBeVisible();
  });
});
