export type SitemapUrlEntry = {
  readonly loc: string;
  readonly lastmod?: string;
  readonly changefreq?: 'daily' | 'weekly' | 'monthly';
  readonly priority?: number;
};

export const SITEMAP_SOURCE = Symbol('SITEMAP_SOURCE');

export interface SitemapSourcePort {
  /** Yields sitemap URL entries in stable batches without loading the full catalog into memory. */
  streamEntries(batchSize: number): AsyncGenerator<readonly SitemapUrlEntry[]>;
}
