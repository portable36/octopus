import { Entity, ManyToOne, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import { SearchSynonymMapping } from './search-synonym-mapping.entity';

@Entity({ tableName: 'search_zero_result_queries' })
@Unique({ properties: ['normalizedQuery'] })
export class SearchZeroResultQuery {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'normalized_query' })
  normalizedQuery!: string;

  @Property({ fieldName: 'occurrence_count' })
  occurrenceCount = 1;

  @Property({ fieldName: 'needs_review' })
  needsReview = false;

  @ManyToOne(() => SearchSynonymMapping, { fieldName: 'mapped_synonym_id', nullable: true })
  mappedSynonym: SearchSynonymMapping | null = null;

  @Property({ fieldName: 'last_seen_at' })
  lastSeenAt: Date = new Date();

  @Property({ fieldName: 'created_at' })
  createdAt: Date = new Date();
}
