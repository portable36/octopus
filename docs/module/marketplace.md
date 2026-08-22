# Marketplace Module

## Responsibility

The Marketplace bounded context provides customer-facing aggregation: storefront discovery, multi-vendor browse experiences, unified cart entry points, and public read models composed from Catalog, Store, Pricing, and Search contracts.

Marketplace owns:

- Storefront routing and vendor/store discovery views (frontend-heavy)
- Composed read models for product listing pages (PLP) and detail pages (PDP)
- Marketplace-level merchandising zones where platform-operated
- Public SEO surfaces for vendor stores and categories

Marketplace does not own:

- Canonical product or inventory records
- Checkout, order, or payment execution
- Vendor onboarding (Vendor module)

## Composition pattern

Marketplace reads through stable application ports:

```text
Catalog lookup + Store offer + Pricing quote + Search index + Inventory availability signal
```

Never join another module's database tables from Marketplace infrastructure.

## Multi-vendor UX

- PLP filters by category, brand, store, price band, and availability signal
- PDP shows store-specific offer, price, and add-to-cart entry
- Cart badge reflects unified multi-vendor cart from Cart module

## Testing requirements

- Composed DTO stability across module version changes
- Unauthorized vendor data not leaked in public endpoints
- Cache invalidation when underlying catalog events fire

## Exit criteria

- Documented port dependencies for PLP/PDP
- E2E smoke path: browse -> PDP -> add to cart

## Related

- [PHASES.md](../PHASES.md) — Phases 18–19
- [frontend.md](../frontend.md)
- [domains/multivendor.md](../domains/multivendor.md)
- [domains/multistore.md](../domains/multistore.md)
