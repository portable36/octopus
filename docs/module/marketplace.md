# Marketplace (composition pattern)

## Responsibility

**Not a required Nest bounded-context module today.** “Marketplace” means customer-facing **composition**: storefront discovery (PLP/PDP/store pages) built from Catalog, Store, Pricing, Search, and Inventory **ports/APIs**.

Owns (conceptually / FE + public read APIs):

- Public browse DTOs and storefront routing
- Merchandising zones driven by Settings/public config (full CMS = Phase 20.3)
- SEO surfaces for categories and stores

Does not own:

- Canonical product/inventory/order/payment records
- Cross-module SQL joins into other modules’ tables

## Composition

```text
Catalog + StoreOffer + Pricing signal + Search index + Inventory availability signal
→ public PLP/PDP DTOs → Next.js (storefront)
```

Prefer extending Catalog/Search public endpoints over inventing `MarketplaceModule` unless aggregation complexity forces a dedicated BC later.

## Multi-vendor UX

- Filters: category, brand (when present), store, vendor, price, availability
- PDP: store-specific offer + add to cart
- Cart: unified multi-vendor cart (Cart module)

## Related

- [PHASES.md](../PHASES.md) — Phase 18
- [search.md](./search.md) · [catalog.md](./catalog.md)
- [product/ux-parity.md](../product/ux-parity.md)
