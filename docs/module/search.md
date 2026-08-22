# Search Module

## Responsibility

The Search bounded context owns Meilisearch indexing, search read models, query APIs, and facet/filter configuration. It is a derived read model, never the source of truth for catalog or inventory.

Search owns:

- Product and category search documents
- Index settings: facets, ranking, typo tolerance, filterable attributes
- Indexing jobs triggered from outbox/catalog events
- Public search and autocomplete query endpoints

Search does not own:

- Product mutation (Catalog module)
- Inventory availability truth (reflects signals from Inventory via events)
- Authorization beyond published storefront visibility rules

## Indexing pipeline

```text
Catalog transaction commits
-> outbox event
-> indexer worker
-> Meilisearch upsert/delete
```

Failed indexing must retry with backoff. Unpublished or archived products must be removed or marked non-purchasable in the index.

## Query rules

- Allowlist filter and sort fields
- Paginate all result sets
- Rate limit expensive queries
- Never expose private vendor data in public search documents

## Testing requirements

- Index upsert and delete idempotency
- Product unpublish removes purchasable signal
- Filter allowlist enforcement
- Lag and retry metrics observable

## Exit criteria

- Async indexing from outbox only
- Search API covered by contract tests
- No direct catalog table reads from presentation layer bypassing contracts

## Related

- [PHASES.md](../PHASES.md) — Phase 16
- [Catalog Module](./catalog.md)
- [ARCHITECTURE.md](../../ARCHITECTURE.md) — Search section
