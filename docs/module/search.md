# Search Module

## Responsibility

Meilisearch **read model** for storefront discovery. Never source of truth for catalog, price, or inventory.

## Octopus index unit

Index **store offers** (product + variant + vendor + store + price), not orphan products. Document ids must be stable (e.g. `offerId`).

## Pipeline (Phase 16.2)

```text
Catalog/Offer or Inventory mutation
→ catalog_outbox / inventory_outbox
→ Phase 12 dispatcher
→ octopus.search-indexing
→ CatalogOfferSearchSourcePort + InventoryPort
→ Meilisearch upsertIfNewer / delete
```

Idempotent consumers use Redis NX on `outboxId`. Out-of-order writes skipped via document `version` / `updatedAtUnix`.

## Query API (Phase 16.3)

- `GET /api/v1/search/products` — public; allowlisted filters only (`q`, category, vendor, store, price, stockStatus, sort, page/limit)
- Response includes app-shaped `facets` (not raw Meili `facetDistribution`)
- Validated tenant scope (`x-vendor-id` / `x-store-id` after auth) overrides client vendor/store query params
- Public search: `searchable = true` only — no cost, supplier, or internal stock qty
- Checkout revalidates Inventory — search stock is informational
- Currency: BDT-first; no FX in search

## Admin reindex

- `POST /api/v1/admin/search/reindex` (platform admin) → pages offer ids → enqueues `SearchReindexBatch` jobs on `octopus.search-indexing` (never indexes inline in HTTP)

## Config

`MEILISEARCH_HOST`, `MEILISEARCH_API_KEY`, `SEARCH_PRODUCTS_INDEX` (compose already runs Meilisearch).

## Related

- [PHASES.md](../PHASES.md) — Phase 16.1–16.3
- [catalog.md](./catalog.md)
