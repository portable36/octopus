# Payment Module

## Responsibility

The Payment bounded context owns payment intents, provider transactions, webhook/callback processing, refunds, **online COD collection**, and internal payment state aligned with orders.

## Backend payment invariants

1. **Idempotency key** on every payment request and callback.
2. **Integer minor units only** — never float/double for money.
3. **No debit without guaranteed credit** — Saga-style orchestration with compensating steps when crossing service boundaries.
4. **Gateway evidence persisted:** provider transaction ID, response code, timestamp on every interaction.
5. **Reconciliation required** — scheduled comparison of gateway reports vs internal records.

Full rule: `.cursor/rules/08-payments-finance.mdc`.

Payment owns:

- Payment intent and payment transaction aggregates
- Online COD (`AWAITING_COLLECTION` → `COLLECTED`) and collection records
- Provider reference IDs and raw callback metadata (redacted in logs) — gateways later
- Amount, currency, and order/payment linkage
- Idempotency records for create/collect/cancel
- Minimal `payment_outbox` rows (Phase 12 dispatcher)

Payment does not own:

- Order business lifecycle beyond coordinated status updates (Order module via `OrderPort.markPaidFromPayment`)
- Vendor ledger posting (Payout module)
- Checkout total calculation (Checkout module)
- POS till/shift cash (POS module — **not** online COD)

## Payment methods

`COD | SSLCOMMERZ | BKASH | NAGAD` — one method per checkout; one intent per store order.

- **COD:** no `clientSecret`; staff collects via `POST /api/v1/payments/cod/:paymentIntentId/collect` with `payment.cod.collect`.
- **Gateways:** method-aware stub intents return `REQUIRES_PAYMENT` + `clientSecret` until live adapters ship.

## Online COD flow

```text
Checkout(COD) → PaymentIntent AWAITING_COLLECTION → Order unpaid (paymentMethod=COD)
→ Fulfillment allowed by policy while PENDING
→ CollectCodPayment (exact amount, idempotent, RBAC)
  or Fulfillment DELIVERED → confirmCodCollectionFromFulfillment
→ COLLECTED + Order.markPaid() + outbox CodCollected
```

Storefront never marks paid. Cancel COD does not mark paid. Courier delivery confirmation uses the trusted Payment seam (not a second payment path).

## Provider port

```text
PaymentPort
  createIntent({ paymentMethod, orderId, ... })
  confirmCodCollection(...)
  cancelIntent(...)
```

Implement SSLCommerz, bKash, and Nagad behind adapters in infrastructure. Domain code never imports provider SDKs.

## Callback handling

Provider callbacks are untrusted external input. Every callback must:

- verify signature/authenticity where supported
- validate schema and idempotency
- match amount, currency, and order/payment reference
- apply state transition inside a transaction
- write outbox events after commit

Never mark an order paid because the browser reached a success redirect URL.

## Security

- Replay protection via idempotency store
- Rate limits on callback endpoints
- No secrets or full card data in logs
- Timeout and retry policies for provider API calls outside DB transactions

## Testing requirements

- COD checkout unpaid + `AWAITING_COLLECTION`, no clientSecret
- Eligibility rejects (disabled store/vendor, amount limits, missing address)
- Collect success → COLLECTED + markPaid; amount mismatch; idempotent / conflicting keys
- Authz: wrong store / missing permission forbidden
- Multi-store: collect A does not affect B
- Cancel does not mark paid
- Gateway createIntent still returns secret shape when method ≠ COD

## Exit criteria

- [x] COD path production-shaped with tests
- [ ] Live gateway adapters behind port with contract tests
- Order coordination documented and tested
- Bangladesh gateway rules aligned with `.cursor/rules/09-payments-bangladesh.mdc`

## Related

- [PHASES.md](../PHASES.md) — Phase 11
- [Order Module](./order.md)
- [Checkout Module](./checkout.md)
- `.cursor/rules/08-payments-finance.mdc`
- `.cursor/rules/37-order-payment.mdc`
