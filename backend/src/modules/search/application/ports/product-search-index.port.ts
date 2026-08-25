import type {
  OfferSearchDocument,
  SearchProductsQuery,
  SearchProductsResult,
} from '../../domain/search.types';

export const PRODUCT_SEARCH_INDEX = Symbol('PRODUCT_SEARCH_INDEX');

export interface ProductSearchIndexPort {
  ensureIndex(): Promise<void>;
  upsert(document: OfferSearchDocument): Promise<void>;
  /** Skip write when indexed version is newer (out-of-order guard). */
  upsertIfNewer(document: OfferSearchDocument): Promise<'written' | 'skipped'>;
  deleteByOfferId(offerId: string): Promise<void>;
  search(query: SearchProductsQuery): Promise<SearchProductsResult>;
}
