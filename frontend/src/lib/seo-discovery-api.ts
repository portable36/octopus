import { getPublicApiBaseUrl } from '@/lib/env';
import { ApiClientError } from '@/lib/api-client';

export type SeoRobotsDirective = 'index' | 'noindex' | 'follow' | 'nofollow';

export type SeoOpenGraph = {
  readonly title?: string;
  readonly description?: string;
  readonly url?: string;
  readonly type?: string;
  readonly imageUrl?: string;
};

export type SeoPageMetadata = {
  readonly title: string;
  readonly description: string;
  readonly canonicalUrl: string;
  readonly openGraph: SeoOpenGraph;
  readonly robotsDirectives: readonly SeoRobotsDirective[];
};

export type SeoPageContext = {
  readonly path: string;
  readonly metadata: SeoPageMetadata;
  readonly structuredData: readonly Record<string, unknown>[];
};

export function isSeoNotFound(error: unknown): boolean {
  return error instanceof ApiClientError && error.status === 404;
}

/** Fetch SSR SEO metadata and JSON-LD for a storefront path (e.g. `/products/uuid`). */
export async function fetchSeoPageContext(path: string): Promise<SeoPageContext> {
  const baseUrl = getPublicApiBaseUrl();
  const url = `${baseUrl}/public/seo/resolve?path=${encodeURIComponent(path)}`;

  const response = await fetch(url, { next: { revalidate: 60 } });

  if (!response.ok) {
    let problem: { detail?: string } | undefined;
    let message = `SEO resolve failed with status ${response.status}`;
    try {
      const payload: unknown = await response.json();
      if (typeof payload === 'object' && payload !== null && 'detail' in payload) {
        const detail = (payload as { detail?: unknown }).detail;
        if (typeof detail === 'string') {
          message = detail;
          problem = { detail };
        }
      }
    } catch {
      // ignore parse failures
    }
    throw new ApiClientError(message, response.status, problem as never);
  }

  return (await response.json()) as SeoPageContext;
}
