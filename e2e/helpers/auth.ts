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

/** Bearer token from `/auth/login`, or null when MFA / bad credentials. */
export async function loginViaApi(
  request: APIRequestContext,
  input: { email: string; password?: string },
): Promise<string | null> {
  const response = await request
    .post(`${API_BASE}/auth/login`, {
      data: { email: input.email, password: input.password ?? E2E_PASSWORD },
    })
    .catch(() => null);
  if (!response?.ok()) {
    return null;
  }
  const body = (await response.json()) as {
    accessToken?: string;
    mfaRequired?: boolean;
  };
  if (body.mfaRequired || !body.accessToken) {
    return null;
  }
  return body.accessToken;
}

/** Staff COD collection — marks the linked order PAID (needed before customer refund request). */
export async function collectCodViaApi(
  request: APIRequestContext,
  input: {
    accessToken: string;
    paymentIntentId: string;
    amountMinor: number;
    currencyCode: string;
    idempotencyKey?: string;
  },
): Promise<boolean> {
  const response = await request
    .post(`${API_BASE}/payments/cod/${encodeURIComponent(input.paymentIntentId)}/collect`, {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Idempotency-Key': input.idempotencyKey ?? `e2e-cod-${Date.now()}`,
      },
      data: {
        amountMinor: input.amountMinor,
        currency: input.currencyCode,
        note: 'E2E COD collect',
      },
    })
    .catch(() => null);
  return Boolean(response?.ok());
}
