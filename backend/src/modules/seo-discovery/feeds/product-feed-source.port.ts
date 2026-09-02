import type { ProductFeedItem } from './product-feed.types';

export const PRODUCT_FEED_SOURCE = Symbol('PRODUCT_FEED_SOURCE');

export interface ProductFeedSourcePort {
  /** Yields indexable catalog feed rows in stable batches. */
  streamItems(batchSize: number): AsyncGenerator<readonly ProductFeedItem[]>;
}
