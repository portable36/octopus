# Cart Module

## Responsibility

The Cart bounded context owns shopping cart state, line items, quantity changes, and pricing snapshots for display and checkout handoff.

Cart owns:

- Cart aggregate scoped to customer or anonymous session
- Cart lines with product, variant, store, and vendor references
- Quantity and line-level metadata
- Display price snapshots (non-authoritative hints)
- Cart validation state before checkout

Cart does not own:

- Authoritative final pricing, tax, shipping, or promotions (Pricing, Checkout)
- Inventory reservations (Inventory module)
- Order creation (Checkout/Order modules)

## Multi-vendor structure

A single cart may contain lines from multiple vendors and stores:

```text
Cart
 ├── Vendor A / Store A -> lines
 └── Vendor B / Store B -> lines
```

Checkout splits or orchestrates per documented order boundaries. Cart never merges vendor financial state.

## Operations

- `addItem`, `removeItem`, `updateQuantity`, `clearCart`
- `validateCart` — checks sellability, basic availability signals, and stale line detection
- `recalculateDisplayTotals` — server-side display recalculation; not checkout authority

## Invariants

- Quantities are positive integers within configured max per line
- Variant and store references must resolve through Catalog/Store contracts
- Vendor/store scope validated server-side on every mutation
- Anonymous carts merge or expire according to documented session policy

## Handoff to checkout

Checkout receives an immutable cart snapshot ID or version. Cart lines copied into checkout must not mutate after checkout starts.

## Testing requirements

- Multi-vendor line isolation
- Quantity bounds and removal idempotency
- Price change detection between cart view and checkout
- Vendor A cart lines invisible to Vendor B actors

## Exit criteria

- Cart aggregate supports multi-store lines
- Validation integrates Catalog and Inventory read contracts
- Checkout handoff contract documented

## Related

- [PHASES.md](../PHASES.md) — Phase 08
- [Checkout Module](./checkout.md)
- `.cursor/rules/36-cart-checkout.mdc`
