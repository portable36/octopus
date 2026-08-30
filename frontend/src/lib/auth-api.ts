import { apiRequest, ApiClientError } from '@/lib/api-client';
import { clearAccessToken, getAccessToken, setAccessToken } from '@/lib/auth-session';
import { getOrCreateGuestToken } from '@/lib/guest-token';

export type AuthUser = {
  userId: string;
  email: string;
  roles: readonly string[];
  mfaEnabled?: boolean;
};

export type AuthSession = {
  accessToken: string;
  expiresInSeconds: number;
  user: AuthUser;
};

export type MfaRequired = {
  mfaRequired: true;
  mfaToken: string;
  expiresInSeconds: number;
};

export class MfaRequiredError extends Error {
  readonly mfaToken: string;
  readonly expiresInSeconds: number;

  constructor(challenge: MfaRequired) {
    super('MFA code required.');
    this.name = 'MfaRequiredError';
    this.mfaToken = challenge.mfaToken;
    this.expiresInSeconds = challenge.expiresInSeconds;
  }
}

export type MeResponse = AuthUser & {
  permissions: readonly string[];
};

let refreshInFlight: Promise<AuthSession> | null = null;

async function mergeGuestCart(accessToken: string): Promise<void> {
  try {
    const guestToken = getOrCreateGuestToken();
    await apiRequest('/cart/merge', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-guest-token': guestToken,
      },
    });
  } catch {
    // Guest cart may be empty or already merged — not a login failure.
  }
}

export async function registerAccount(input: {
  email: string;
  name: string;
  password: string;
}): Promise<AuthSession> {
  const session = await apiRequest<AuthSession>('/auth/register', {
    method: 'POST',
    credentials: 'include',
    body: {
      email: input.email,
      name: input.name,
      password: input.password,
    },
  });
  setAccessToken(session.accessToken);
  await mergeGuestCart(session.accessToken);
  return session;
}

export async function loginAccount(input: {
  email: string;
  password: string;
}): Promise<AuthSession> {
  const result = await apiRequest<AuthSession | MfaRequired>('/auth/login', {
    method: 'POST',
    credentials: 'include',
    body: input,
  });
  if ('mfaRequired' in result && result.mfaRequired) {
    throw new MfaRequiredError(result);
  }
  const session = result as AuthSession;
  setAccessToken(session.accessToken);
  await mergeGuestCart(session.accessToken);
  return session;
}

export async function verifyMfaLogin(input: {
  mfaToken: string;
  code: string;
}): Promise<AuthSession> {
  const session = await apiRequest<AuthSession>('/auth/mfa/verify', {
    method: 'POST',
    credentials: 'include',
    body: input,
  });
  setAccessToken(session.accessToken);
  await mergeGuestCart(session.accessToken);
  return session;
}

export type MfaSetup = {
  secret: string;
  otpauthUrl: string;
};

export function beginMfaSetup(): Promise<MfaSetup> {
  return authedRequest<MfaSetup>('/auth/mfa/setup', { method: 'POST' });
}

export function enableMfa(code: string): Promise<void> {
  return authedRequest<void>('/auth/mfa/enable', {
    method: 'POST',
    body: { code },
  });
}

export async function refreshSession(): Promise<AuthSession> {
  if (!refreshInFlight) {
    refreshInFlight = apiRequest<AuthSession>('/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    })
      .then((session) => {
        setAccessToken(session.accessToken);
        return session;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: { email },
  });
}

export async function logoutAccount(): Promise<void> {
  const token = getAccessToken();
  try {
    await apiRequest('/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  } finally {
    clearAccessToken();
  }
}

export async function fetchMe(): Promise<MeResponse> {
  return authedRequest<MeResponse>('/auth/me');
}

export async function ensureAccessToken(): Promise<string | null> {
  const existing = getAccessToken();
  if (existing) {
    return existing;
  }
  try {
    const session = await refreshSession();
    return session.accessToken;
  } catch {
    clearAccessToken();
    return null;
  }
}

type AuthedOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

/** Bearer API call; one refresh retry on 401. Never puts tokens in the URL. */
export async function authedRequest<TResponse>(
  path: string,
  options: AuthedOptions = {},
): Promise<TResponse> {
  let token = await ensureAccessToken();
  if (!token) {
    throw new ApiClientError('Not authenticated', 401);
  }

  try {
    return await apiRequest<TResponse>(path, {
      ...options,
      headers: {
        ...(options.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    if (!(error instanceof ApiClientError) || error.status !== 401) {
      throw error;
    }
    clearAccessToken();
    const session = await refreshSession();
    token = session.accessToken;
    return apiRequest<TResponse>(path, {
      ...options,
      headers: {
        ...(options.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    });
  }
}
