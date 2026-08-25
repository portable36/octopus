# Search Module

## Responsibility

Meilisearch **read model** for storefront discovery. Never source of truth for catalog, price, or inventory.

## Octopus index unit

Index **store offers** (product + variant + vendor + store + price), not orphan products. Document ids must be stable (e.g. `offerId`).

## Pipeline

```text
Catalog/Offer mutation (+ catalog_outbox)
→ Phase 12 dispatcher
→ octopus.search-indexing
→ load authoritative DB state
→ Meilisearch upsert/delete
```

**Current gap:** Catalog emits in-memory domain events; outbox persistence must ship in Phase 16.2.

## Query rules

- Allowlist filters/sorts only
- Public search: published/available offers only — no cost, supplier, or internal stock qty
- Checkout revalidates Inventory — search stock is informational
- Currency: BDT-first; no FX in search

## Config

`MEILISEARCH_HOST`, `MEILISEARCH_API_KEY`, `SEARCH_PRODUCTS_INDEX` (compose already runs Meilisearch).

## Related

- [PHASES.md](../PHASES.md) — Phase 16.1–16.3
- [catalog.md](./catalog.md)
