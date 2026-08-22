# Taxation

## Concept

Tax is calculated during checkout from jurisdiction, product tax class, shipping address, and store/vendor policy. Results are snapshotted on the order.

## Rules

- Tax amounts use integer minor units
- Tax configuration changes do not retroactively alter paid orders
- Exemptions and zero-rated classes must be explicit in catalog metadata references
- Display tax separately where regulations require

## Module boundaries

- Catalog holds tax **classification references** on products/variants
- Checkout/pricing engine computes tax lines
- Order stores immutable tax snapshot

## Testing

- Address jurisdiction changes alter tax at checkout only
- Mixed-tax carts split correctly in multi-vendor checkout
- Rounding policy documented and unit-tested

## Related

- [PHASES.md](../PHASES.md) — Phase 07, Phase 09
- [domains/pricing.md](./pricing.md)
- [Checkout Module](../module/checkout.md)
