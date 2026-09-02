export type ImageSitemapImageEntry = {
  readonly imageLoc: string;
  readonly title: string;
};

export type ImageSitemapUrlEntry = {
  readonly loc: string;
  readonly images: readonly ImageSitemapImageEntry[];
};

export const IMAGE_SITEMAP_SOURCE = Symbol('IMAGE_SITEMAP_SOURCE');

export interface ImageSitemapSourcePort {
  streamEntries(batchSize: number): AsyncGenerator<readonly ImageSitemapUrlEntry[]>;
}
