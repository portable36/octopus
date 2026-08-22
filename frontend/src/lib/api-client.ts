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
};

export async function apiRequest<TResponse>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<TResponse> {
  const baseUrl = getPublicApiBaseUrl();
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

  const headers = new Headers(options.headers);
  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  });

  if (!response.ok) {
    let problem: ApiProblemDetails | undefined;
    try {
      const payload: unknown = await response.json();
      if (typeof payload === 'object' && payload !== null && 'status' in payload) {
        problem = payload as ApiProblemDetails;
      }
    } catch {
      // ignore parse failures for non-JSON error bodies
    }

    throw new ApiClientError(
      problem?.detail ?? `Request failed with status ${response.status}`,
      response.status,
      problem,
    );
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

export async function fetchHealthLive(): Promise<{ status: string }> {
  return apiRequest<{ status: string }>('/health/live');
}
