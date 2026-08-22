# Pricing

## Authority

The **backend pricing engine** is the sole authority for checkout totals. Frontend prices are display hints only.

## Inputs

Pricing combines, at minimum:

- Catalog base/compare-at metadata
- Store offer price
- Active promotions and coupons
- Tax rules
- Shipping selections
- Platform commission segments where calculated at checkout

## Rules

- Integer minor units and explicit ISO currency
- Never use floating point for money arithmetic
- Persist inputs required to reproduce final charged amounts on the order snapshot
- Recalculate on checkout submission; reject stale cart checkout when policy requires

## Module ownership

| Concern             | Owner                     |
| ------------------- | ------------------------- |
| Promotion rules     | Pricing/Promotion phase   |
| Checkout totals     | Checkout module           |
| Order snapshots     | Order module              |
| Catalog list prices | Catalog module (metadata) |

## Related

- [PHASES.md](../PHASES.md) — Phase 07
- [Checkout Module](../module/checkout.md)
- [domains/promotions.md](./promotions.md)
- [domains/taxation.md](./taxation.md)
