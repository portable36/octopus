# Marketplace (composition pattern)

## Responsibility

**Not a Nest bounded-context module.** Customer-facing **composition**: storefront discovery built from Catalog, Store, Search, and Inventory via **public read APIs**.

## Public APIs (Phase 18.1)

| Surface               | Endpoint                                                                  |
| --------------------- | ------------------------------------------------------------------------- |
| Categories            | `GET /api/v1/public/categories`, `GET /api/v1/public/categories/:slug`    |
| PDP                   | `GET /api/v1/public/products/:productId` (published only + active offers) |
| Store                 | `GET /api/v1/public/stores/by-slug/:slug?vendorId=`                       |
| Search / PLP          | `GET /api/v1/search/products` (`@Public`, allowlisted filters)            |
| Media thumbnails      | `GET /api/v1/public/media/:mediaId` → `{ url }`                           |
| Cart (guest/customer) | existing `/cart` + `POST /cart/merge`                                     |
| Customer profile      | `/customer/*`                                                             |

Published/active filters are enforced in handlers; additive RLS public SELECT policies enable anonymous reads without platform scope.

## Composition

```text
Catalog + StoreOffer + Search index + Inventory signals
→ public DTOs → Next.js storefront (Phase 18.2+)
```

Prefer extending Catalog/Search public endpoints over inventing `MarketplaceModule`.

## Storefront routes (Phase 18.2)

| Route                               | Role                                                                                |
| ----------------------------------- | ----------------------------------------------------------------------------------- |
| `/`                                 | Home — category shells + CTA to search                                              |
| `/categories`, `/categories/[slug]` | Category index + PLP (search scoped by category id)                                 |
| `/stores/[slug]?vendorId=`          | Store page + offers (optional vendor disambiguation)                                |
| `/products/[productId]`             | PDP — published product + active offers + add to cart                               |
| `/search?...`                       | Offer search; filters in URL (`q`, category/store/vendor, price, stock, sort, page) |
| `/cart`                             | Guest cart (`x-guest-token`); line prices are display hints                         |
| `/checkout`                         | COD submit via `POST /checkout/submit` + `Idempotency-Key`                          |
| `/checkout/success`                 | Multi-store order refs + **server** `totals` from checkout outcome                  |
| `/login`, `/register`               | Identity auth (refresh cookie + Bearer access; no `?token=`)                        |
| `/account/*`                        | Profile, addresses, orders, returns (authenticated)                                 |
| `/vendor/register`                  | Customer vendor application when enabled by platform settings                       |

Layout: `frontend/src/app/(storefront)/` + `StorefrontShell`. Search goes through Nest only (`GET /search/products`); never Meilisearch from the browser. Prices/stock are display until checkout.

## SEO serve (Phase 18.5)

- `generateMetadata` + canonical/OG on home, categories, PDP, store; search/facet URLs `noindex`
- Product + Breadcrumb JSON-LD (no AggregateRating)
- `robots.ts` disallows `/admin`, `/account`, `/cart`, `/checkout`, `/login`, `/register`, `/vendor`
- `sitemap.xml` from active categories + `GET /api/v1/public/sitemap/products` (DB published ids — not Meili)
- Site origin: `NEXT_PUBLIC_SITE_URL`

## Multi-vendor UX

- Filters: category, store, vendor, price, availability (via Search)
- PDP: store-specific offers + add to cart
- Cart: unified multi-vendor cart; checkout may split orders per store
- COD eligibility and grand totals: backend only (never browser-calculated)

## Related

- [PHASES.md](../PHASES.md) — Phase 18
- [customer.md](./customer.md) · [search.md](./search.md) · [catalog.md](./catalog.md)
