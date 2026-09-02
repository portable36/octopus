export const SEO_DISCOVERY_QUEUE = 'seo-discovery-queue' as const;

export const SEO_DISCOVERY_JOB_NAMES = {
  generateSitemapCache: 'generate-sitemap-cache',
  generateProductFeeds: 'generate-product-feeds',
  sendMetaCapiEvent: 'send-meta-capi-event',
} as const;

export type SeoDiscoveryJobName =
  (typeof SEO_DISCOVERY_JOB_NAMES)[keyof typeof SEO_DISCOVERY_JOB_NAMES];
