import { Migration } from '@mikro-orm/migrations';

/** Semantic search — synonym mappings and zero-result query learning. */
export class Migration20260902110000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "search_synonym_mappings" (
        "id" uuid not null,
        "source_term" text not null,
        "target_terms" jsonb not null default '[]',
        "status" text not null default 'pending',
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint "search_synonym_mappings_pkey" primary key ("id"),
        constraint "search_synonym_mappings_source_term_uidx" unique ("source_term"),
        constraint "search_synonym_mappings_status_chk"
          check ("status" in ('active', 'pending'))
      );
    `);
    this.addSql(`
      create table if not exists "search_zero_result_queries" (
        "id" uuid not null,
        "normalized_query" text not null,
        "occurrence_count" int not null default 1,
        "needs_review" boolean not null default false,
        "mapped_synonym_id" uuid null,
        "last_seen_at" timestamptz not null,
        "created_at" timestamptz not null,
        constraint "search_zero_result_queries_pkey" primary key ("id"),
        constraint "search_zero_result_queries_normalized_query_uidx"
          unique ("normalized_query"),
        constraint "search_zero_result_queries_mapped_synonym_id_fkey"
          foreign key ("mapped_synonym_id") references "search_synonym_mappings" ("id")
          on update cascade on delete set null
      );
    `);
    this.addSql(`
      create index if not exists "search_zero_result_queries_needs_review_idx"
        on "search_zero_result_queries" ("needs_review", "occurrence_count" desc);
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "search_zero_result_queries";`);
    this.addSql(`drop table if exists "search_synonym_mappings";`);
  }
}
