# Checkout Module

## Responsibility

The Checkout bounded context orchestrates the authoritative purchase pipeline: address capture, shipping selection, tax/discount/shipping/commission calculation, inventory reservation, order creation, and payment intent creation.

Checkout owns:

- Checkout session aggregate and idempotency key binding
- Shipping address snapshot and shipping method selection
- Server-side total calculation pipeline
- Checkout submission command and result
- Handoff references to created orders and payment intents

Checkout does not own:

- Long-lived order state machine (Order module)
- Payment provider callbacks (Payment module)
- Product catalog truth (Catalog module)

## Submission pipeline

```text
validate user/session
-> validate cart snapshot
-> validate products and store offers
-> recalculate authoritative prices, tax, discounts, shipping, commission
-> validate promotions and coupons
-> reserve inventory per line
-> create order(s) per split policy
-> create payment intent(s)
-> persist checkout outcome
-> emit outbox events
```

## Idempotency

Checkout submission requires `Idempotency-Key`. Retries return the same outcome without duplicate orders or duplicate reservations.

## Multi-vendor checkout

Unified checkout may create multiple orders when fulfillment, payout, tax, or payment rules require independent boundaries. Never mutate one vendor's order while processing another vendor's lines in the same request without explicit orchestration and separate aggregates.

## Invariants

- Browser-calculated totals are never authoritative
- Inventory reservation precedes or accompanies order creation per documented transaction boundary
- Failed payment does not leave orphaned reservations without compensating release
- Address and shipping snapshots are immutable on the created order

## Testing requirements

- Duplicate idempotency key
- Concurrent checkout on last unit of stock
- Price, coupon, or tax change mid-checkout
- Partial failure rollback (reservation release)
- Multi-vendor split order creation

## Exit criteria

- [x] End-to-end checkout command with idempotency
- [x] Order and Payment contracts invoked through ports only
- [x] Unit tests cover failure and retry paths (integration tests expand with Phase 10/11)
- [x] Storefront COD checkout UI (Phase 18.3) — eligibility + totals from API only

## Phase 09 notes

`ORDER_PORT` is owned by `OrderModule` (Phase 10). `PAYMENT_PORT` is owned by `PaymentModule` (Phase 11), including online COD. Checkout requires `paymentMethod`, creates **one intent per store order** after orders exist, and uses a longer inventory reservation TTL for COD.

## Related

- [PHASES.md](../PHASES.md) — Phase 09
- [Cart Module](./cart.md)
- [Order Module](./order.md)
- [Payment Module](./payment.md)
- `.cursor/rules/36-cart-checkout.mdc`
