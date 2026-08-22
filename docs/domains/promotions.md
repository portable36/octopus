# Promotions

## Concept

Promotions include coupons, campaigns, percentage/fixed discounts, product/category/store/vendor scoped rules, usage limits, and expiration windows.

## Rules

- Promotion evaluation runs server-side during cart validation and checkout
- Stackability and precedence must be explicit and tested
- Usage limits enforced atomically (database-backed, not Redis-only)
- Expired or inapplicable promotions fail with stable error codes
- Never trust client-submitted discount amounts

## Promotion types

- Percentage discount
- Fixed amount discount
- Minimum order threshold
- Product-, category-, vendor-, or store-scoped eligibility
- Per-customer usage caps

## Related

- [PHASES.md](../PHASES.md) — Phase 07
- [domains/pricing.md](./pricing.md)
- [Cart Module](../module/cart.md)
- [Checkout Module](../module/checkout.md)
