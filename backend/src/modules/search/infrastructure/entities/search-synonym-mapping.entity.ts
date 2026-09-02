import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';

export type SearchSynonymStatus = 'active' | 'pending';

@Entity({ tableName: 'search_synonym_mappings' })
@Unique({ properties: ['sourceTerm'] })
export class SearchSynonymMapping {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'source_term' })
  sourceTerm!: string;

  @Property({ fieldName: 'target_terms', type: 'json' })
  targetTerms: string[] = [];

  @Property()
  status: SearchSynonymStatus = 'pending';

  @Property({ fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ fieldName: 'updated_at', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
