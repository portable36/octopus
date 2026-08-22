# Payment Module

## Responsibility

The Payment bounded context owns payment intents, provider transactions, webhook/callback processing, refunds, and internal payment state aligned with orders.

Payment owns:

- Payment intent and payment transaction aggregates
- Provider reference IDs and raw callback metadata (redacted in logs)
- Amount, currency, and order/payment linkage
- Idempotency records for callbacks and capture commands
- Refund commands and provider refund correlation

Payment does not own:

- Order business lifecycle beyond coordinated status updates (Order module)
- Vendor ledger posting (Payout module)
- Checkout total calculation (Checkout module)

## Provider port

```text
PaymentProvider
  createPayment()
  verifyPayment()
  refund()
  parseWebhook()
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

- Duplicate callback idempotency
- Amount/currency mismatch rejection
- Signature failure paths
- Partial and full refunds within limits
- Provider outage and retry behavior

## Exit criteria

- Provider adapters behind port with contract tests
- Order coordination documented and tested
- Bangladesh gateway rules aligned with `.cursor/rules/09-payments-bangladesh.mdc`

## Related

- [PHASES.md](../PHASES.md) — Phase 11
- [Order Module](./order.md)
- `.cursor/rules/08-payments-finance.mdc`
- `.cursor/rules/09-payments-bangladesh.mdc`
- `.cursor/rules/37-order-payment.mdc`
