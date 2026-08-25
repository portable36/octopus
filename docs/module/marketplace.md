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

## Multi-vendor UX

- Filters: category, store, vendor, price, availability (via Search)
- PDP: store-specific offers + add to cart
- Cart: unified multi-vendor cart

## Related

- [PHASES.md](../PHASES.md) — Phase 18
- [customer.md](./customer.md) · [search.md](./search.md) · [catalog.md](./catalog.md)
