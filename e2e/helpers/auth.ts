import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { API_BASE, isApiLive } from './api';

export const E2E_PASSWORD = 'E2eTestPass1!';

export function uniqueE2eEmail(prefix = 'e2e'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@octopus.test`;
}

export async function registerViaUi(
  page: Page,
  input: { email: string; name?: string; password?: string },
): Promise<void> {
  await page.goto('/register');
  await page.getByLabel('Name').fill(input.name ?? 'E2E Customer');
  await page.getByLabel('Email').fill(input.email);
  await page.getByLabel('Password').fill(input.password ?? E2E_PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/account/, { timeout: 30_000 });
}

export async function loginViaUi(
  page: Page,
  input: { email: string; password?: string },
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(input.email);
  await page.getByLabel('Password', { exact: true }).fill(input.password ?? E2E_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
}

/** First searchable offer product id, or null when catalog is empty. */
export async function findFirstOfferProductId(request: APIRequestContext): Promise<string | null> {
  if (!(await isApiLive(request))) {
    return null;
  }
  const response = await request.get(`${API_BASE}/search/products?q=&limit=5`).catch(() => null);
  if (!response?.ok()) {
    return null;
  }
  const body = (await response.json()) as {
    hits?: readonly { productId?: string; id?: string }[];
  };
  const first = body.hits?.[0];
  return first?.productId ?? null;
}
