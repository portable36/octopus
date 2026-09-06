export const SEARCH_SYNONYM_PORT = Symbol('SEARCH_SYNONYM_PORT');

export type SearchSynonymDto = {
  readonly id: string;
  readonly sourceTerm: string;
  readonly targetTerms: readonly string[];
  readonly status: 'active' | 'pending';
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type ZeroResultQueryDto = {
  readonly id: string;
  readonly normalizedQuery: string;
  readonly occurrenceCount: number;
  readonly needsReview: boolean;
  readonly mappedSynonymId: string | null;
  readonly lastSeenAt: Date;
};

export interface SearchSynonymPort {
  recordZeroResultQuery(rawQuery: string): Promise<void>;
  listZeroResultQueries(onlyNeedsReview?: boolean): Promise<readonly ZeroResultQueryDto[]>;
  listSynonyms(): Promise<readonly SearchSynonymDto[]>;
  createSynonym(input: {
    readonly sourceTerm: string;
    readonly targetTerms: readonly string[];
    readonly activateImmediately?: boolean;
  }): Promise<SearchSynonymDto>;
  activateSynonym(id: string): Promise<SearchSynonymDto>;
  mapZeroResultToSynonym(
    zeroResultQueryId: string,
    targetTerms: readonly string[],
  ): Promise<{
    readonly synonym: SearchSynonymDto;
    readonly query: ZeroResultQueryDto;
  }>;
  pushSynonymsToMeilisearch(): Promise<void>;
}
