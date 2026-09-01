import { expect, test } from '@playwright/test';

/**
 * Phase 26.1 — storefront + admin shell smokes (page renders; no authenticated flows yet).
 * Full revenue journeys land when seed data + API are available in CI.
 */

test.describe('storefront home', () => {
  test('renders marketplace landing', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Good finds. Close to home.' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Explore offers' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Browse categories' })).toBeVisible();
  });
});

test.describe('browse and search', () => {
  test('categories page loads', async ({ page }) => {
    await page.goto('/categories');
    await expect(page.getByRole('heading', { level: 1, name: 'Categories' })).toBeVisible();
  });

  test('search page loads', async ({ page }) => {
    await page.goto('/search');
    await expect(page.getByRole('heading', { level: 1, name: /search/i })).toBeVisible();
  });
});

test.describe('cart', () => {
  test('cart page loads', async ({ page }) => {
    await page.goto('/cart');
    await expect(page.getByRole('heading', { level: 1, name: /cart/i })).toBeVisible();
  });
});

test.describe('auth pages', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1, name: 'Welcome back' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
  });

  test('register page loads', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { level: 1, name: 'Create your account' })).toBeVisible();
  });
});

test.describe('admin shell', () => {
  test('redirects unauthenticated visitors to login', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { level: 1, name: 'Welcome back' })).toBeVisible();
  });
});
