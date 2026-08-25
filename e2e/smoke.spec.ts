import { expect, test } from '@playwright/test';

test.describe('storefront home', () => {
  test('renders Octopus foundation landing', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Octopus' })).toBeVisible();
    await expect(page.getByText(/Next\.js App Router foundation/i)).toBeVisible();
  });
});

test.describe('admin shell', () => {
  test('dashboard page loads', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText(/Operational overview/i)).toBeVisible();
  });
});
