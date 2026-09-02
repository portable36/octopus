import { apiRequest } from '@/lib/api-client';

export type SeoArtifactSyncStatus = {
  readonly status: 'fresh' | 'stale' | 'missing';
  readonly lastUpdatedAt: string | null;
  readonly detail: string | null;
};

export type SeoAdminHealth = {
  readonly brokenRedirectsCount: number;
  readonly missingMetadataCount: number;
  readonly jobs: {
    readonly sitemap: SeoArtifactSyncStatus;
    readonly productFeeds: SeoArtifactSyncStatus;
    readonly metaCapi: { readonly status: 'configured' | 'not_configured' };
  };
  readonly recentJobs: readonly {
    readonly jobName: string;
    readonly status: string;
    readonly lastRunAt: string | null;
  }[];
};

export type SeoOverrideInput = {
  readonly entityType: 'product' | 'category' | 'cms';
  readonly entityId: string;
  readonly title?: string | null;
  readonly description?: string | null;
  readonly noindex?: boolean | null;
  readonly canonicalUrl?: string | null;
};

export type RedirectInput = {
  readonly sourcePath: string;
  readonly targetPath?: string | null;
  readonly statusCode: 301 | 302 | 410;
};

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export function fetchSeoAdminHealth(token: string) {
  return apiRequest<SeoAdminHealth>('/admin/seo/health', {
    headers: authHeaders(token),
  });
}

export function saveSeoOverride(token: string, body: SeoOverrideInput) {
  return apiRequest('/admin/seo/overrides', {
    method: 'POST',
    headers: authHeaders(token),
    body,
  });
}

export function saveSeoRedirects(token: string, body: RedirectInput | { redirects: RedirectInput[] }) {
  return apiRequest('/admin/seo/redirects', {
    method: 'POST',
    headers: authHeaders(token),
    body,
  });
}

export function enqueueSeoSitemapRefresh(token: string) {
  return apiRequest('/admin/seo/jobs/sitemap', {
    method: 'POST',
    headers: authHeaders(token),
  });
}

export function enqueueSeoProductFeeds(token: string) {
  return apiRequest('/admin/seo/jobs/product-feeds', {
    method: 'POST',
    headers: authHeaders(token),
  });
}
