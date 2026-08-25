export const SEARCH_REINDEX_ENQUEUER = Symbol('SEARCH_REINDEX_ENQUEUER');

export type SearchReindexEnqueueResult = {
  readonly batches: number;
  readonly offerIds: number;
};

export interface SearchReindexEnqueuerPort {
  enqueueOfferBatches(batches: readonly (readonly string[])[]): Promise<SearchReindexEnqueueResult>;
}
