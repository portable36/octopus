/**
 * Core SEO discovery domain contracts.
 * Authoritative catalog/store facts live in other bounded contexts — these types
 * describe derived SEO projections and policies only.
 */

export type RobotsDirective = 'index' | 'noindex' | 'follow' | 'nofollow';

export type RedirectStatusCode = 301 | 302 | 410;

export interface OpenGraphMetadata {
  readonly title?: string;
  readonly description?: string;
  readonly url?: string;
  readonly type?: string;
  readonly imageUrl?: string;
}

export interface SEOMetadata {
  readonly title: string;
  readonly description: string;
  readonly canonicalUrl: string;
  readonly openGraph: OpenGraphMetadata;
  readonly robotsDirectives: readonly RobotsDirective[];
}

/** Flexible JSON-LD document wrapper — schema.org payloads vary by page type. */
export interface StructuredData {
  readonly '@context': 'https://schema.org' | (string & {});
  readonly '@type': string;
  readonly [key: string]: unknown;
}

export interface RedirectRule {
  readonly sourceUrl: string;
  readonly targetUrl: string;
  readonly statusCode: RedirectStatusCode;
}
