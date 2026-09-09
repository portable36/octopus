import { getPublicApiBaseUrl } from '@/lib/env';

export type ApiProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  errors?: Array<{ field: string; message: string }>;
};

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly problem?: ApiProblemDetails,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  /** Default 30s — prevents hung shells when the API pool is wedged. */
  timeoutMs?: number;
};

const DEFAULT_API_TIMEOUT_MS = 30_000;

export async function apiRequest<TResponse>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<TResponse> {
  const baseUrl = getPublicApiBaseUrl();
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const { timeoutMs = DEFAULT_API_TIMEOUT_MS, body, headers: initHeaders, signal, ...rest } =
    options;

  const headers = new Headers(initHeaders);
  if (body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);
  const onExternalAbort = () => timeoutController.abort();
  signal?.addEventListener('abort', onExternalAbort);

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      signal: timeoutController.signal,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
  } catch (error) {
    const aborted =
      (error instanceof DOMException && error.name === 'AbortError') ||
      (error instanceof Error && error.name === 'AbortError');
    if (aborted) {
      throw new ApiClientError('Request timed out. The API may be unavailable.', 408);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', onExternalAbort);
  }

  if (!response.ok) {
    let problem: ApiProblemDetails | undefined;
    let message = `Request failed with status ${response.status}`;
    try {
      const payload: unknown = await response.json();
      if (typeof payload === 'object' && payload !== null) {
        const record = payload as Record<string, unknown>;
        if ('status' in record && typeof record.detail === 'string') {
          problem = payload as ApiProblemDetails;
          message = problem.detail;
        } else if (typeof record.message === 'string') {
          message = record.message;
        } else if (
          typeof record.message === 'object' &&
          record.message !== null &&
          typeof (record.message as { message?: unknown }).message === 'string'
        ) {
          message = (record.message as { message: string }).message;
        }
      }
    } catch {
      // ignore parse failures for non-JSON error bodies
    }

    throw new ApiClientError(message, response.status, problem);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

export async function fetchHealthLive(): Promise<{ status: string }> {
  return apiRequest<{ status: string }>('/health/live');
}
