# Pricing Module

## Responsibility

Authoritative price quotes and promotion/coupon evaluation. Frontend prices are display hints only.

## Boundaries

| Owns                                                                | Does not own                            |
| ------------------------------------------------------------------- | --------------------------------------- |
| Quote calculation (base, sale, discount, tax, shipping, commission) | Catalog list/offer prices (inputs)      |
| Promotion and coupon rules, usage limits                            | Cart persistence (Phase 08)             |
| Idempotent promotion usage recording                                | Payment capture / ledger (later phases) |

## HTTP

- `POST /api/v1/pricing/stores/:storeId/promotions`
- `GET /api/v1/pricing/stores/:storeId/promotions`
- `POST /api/v1/pricing/stores/:storeId/promotions/:id/activate|disable`
- `POST /api/v1/pricing/quote`
- `POST /api/v1/pricing/promotions/usage`

## Cross-module seam

`PRICING_PORT` in shared-kernel — used by cart/checkout later.

## Money

Integer minor units + ISO currency only. Tax/commission rates are basis points on the quote request until dedicated rate tables land.

## Related

- [domains/pricing.md](../domains/pricing.md)
- [domains/promotions.md](../domains/promotions.md)
- [PHASES.md](../PHASES.md) — Phase 07
