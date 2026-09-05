# Implementation Plan: Local Bangladesh Payment Gateways (SSLCommerz, bKash, Nagad)

**Branch**: `002-bangladesh-payments` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-bangladesh-payments/spec.md` with decisions:

- Q1 = A (Unified `PaymentGatewayPort` / `PaymentProviderAdapter` architecture covering SSLCommerz, bKash, and Nagad)
- Q2 = A (Hosted gateway redirection with server-side secondary verification)
- Q3 = A (Dual-mode adapters: live HTTP sandbox/production with deterministic simulation fallback)
- Q4 = A (Database transaction + Redis replay guard + Outbox event + secondary provider server-to-server validation query)
- Q5 = A (Integrated gateway refund execution dispatching to provider adapters)

## Summary

Implement the complete Phase 11 payment gateway layer supporting all primary Bangladeshi digital payment rails:

1. **Unified Gateway Port (`PaymentGatewayPort`)**: Abstracting session initiation, verification, and refunding across SSLCommerz, bKash, and Nagad.
2. **Dual-Mode Adapters**:
   - `SslCommerzGatewayAdapter`: Session create via `gwprocess/v4/api.php`, secondary validation via `validator/api/validationserverAPI.php`, refund via `validator/api/merchantTransIDvalidationAPI.php`.
   - `BkashGatewayAdapter`: Tokenized checkout v1.2.0-beta (`createPayment`, `executePayment`, `queryPayment`, `refundPayment`).
   - `NagadGatewayAdapter`: Direct checkout (`check-out/initialize`, callback decryption & verification, refund).
   - Mock simulation fallback when credentials are not configured or `PAYMENT_GATEWAY_MODE=sandbox-mock`.
3. **Public Gateway Webhook/Callback Controller (`PaymentGatewayController`)**:
   - Endpoints for SSLCommerz (`/payments/gateways/sslcommerz/callback`, `/payments/gateways/sslcommerz/ipn`).
   - Endpoints for bKash (`/payments/gateways/bkash/callback`).
   - Endpoints for Nagad (`/payments/gateways/nagad/callback`).
4. **Replay Protection & Financial Integrity**:
   - Redis distributed locking / hash verification on `payment:gateway:trx:<trxId>` to eliminate double-submit and replay loops.
   - Exact `amountMinor` and `currencyCode` verification against the internal `PaymentIntent`.
   - Transitions `PaymentIntent` status to `CAPTURED`, records `PaymentTransactionOrmEntity` with provider transaction ID and raw gateway evidence.
   - Invokes `OrderPort.markPaidFromPayment` and writes `PaymentCaptured` to `payment_outbox` within the same database transaction.
5. **Gateway Refund Dispatcher (`PaymentGatewayRefundDispatcher`)**:
   - Replaces `StubPaymentRefundGateway`, routing refunds to the original payment gateway or COD cash reversal.
   - Decrements refundable balance and records the provider's refund transaction ID in `payment_refunds`.

## Technical Context

**Language/Version**: TypeScript 5.6+, Node.js 22 LTS  
**Primary Dependencies**: NestJS 10, MikroORM 6, PostgreSQL 16, Redis (ioredis), Vitest, crypto (Node.js stdlib)  
**Storage**: PostgreSQL (`payment_intents`, `payment_transactions`, `payment_refunds`, `payment_outbox`, `payment_operations`)  
**Testing**: Vitest unit, domain, and integration tests  
**Target Platform**: Linux / Windows multi-vendor server runtime  
**Project Type**: NestJS Modular Monolith with DDD and Clean Architecture  
**Constraints**:
- Integer minor units (`amountMinor` in paisa). Zero floating point arithmetic (`.cursor/rules/08-payments-finance.mdc`).
- Zero trust on frontend redirects. Order `markPaid` only on server-verified secondary query (`.cursor/rules/37-order-payment.mdc`).
- High-entropy idempotency and Redis replay prevention (`.cursor/rules/09-payments-bangladesh.mdc`).
- External HTTP calls strictly outside of database transactions.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- [x] **Financial Correctness**: Currency verified as `BDT`. All amounts computed in integer minor units (paisa). No float arithmetic.
- [x] **No Frontend Mark Paid**: Storefront redirect URLs never mark an order `PAID`. Only backend secondary verification queries trigger `OrderPort.markPaidFromPayment`.
- [x] **Idempotency & Replay Protection**: Redis atomic setnx/lock on provider transaction IDs prevents replay loops.
- [x] **Transactional Outbox**: `PaymentCaptured` domain event persisted inside the business transaction.
- [x] **Zero Cross-Module Imports**: Calls to Order module route via `OrderPort`. No direct imports.
- [x] **External Network Calls Outside Transactions**: Gateway HTTP calls execute prior to opening the database transaction that mutates payment/order state.

## Project Structure

### Documentation (this feature)

```text
specs/002-bangladesh-payments/
├── plan.md              # Architectural implementation plan
├── research.md          # Architectural research & provider API specifications
├── data-model.md        # Entity definitions & schema migrations
├── quickstart.md        # Verification and scenario runbook
├── contracts/           # API contract definitions
│   └── payment-gateways-api.md
└── checklists/
    └── requirements.md  # Quality validation checklist
```

### Source Code Touched

```text
backend/src/
├── shared-kernel/
│   └── application/ports/
│       └── payment.port.ts                             # Extended with redirectUrl in CreatePaymentIntentResult
├── modules/
│   ├── payment/
│   │   ├── domain/
│   │   │   ├── payment.types.ts                        # Added CAPTURED status and gateway types
│   │   │   ├── aggregates/
│   │   │   │   └── payment-intent.aggregate.ts         # Added markCaptured() method
│   │   │   └── ports/
│   │   │       └── payment-gateway.port.ts             # Domain port for gateway adapters
│   │   ├── application/
│   │   │   ├── commands/
│   │   │   │   └── payment-gateway.handlers.ts         # Handlers for gateway callbacks & IPNs
│   │   │   └── ports/
│   │   │       └── payment-refund-gateway.port.ts      # Refund port
│   │   ├── infrastructure/
│   │   │   ├── gateways/
│   │   │   │   ├── sslcommerz-gateway.adapter.ts       # SSLCommerz session, verify, refund
│   │   │   │   ├── bkash-gateway.adapter.ts            # bKash tokenized session, verify, refund
│   │   │   │   ├── nagad-gateway.adapter.ts            # Nagad session, verify, refund
│   │   │   │   └── payment-gateway-refund-dispatcher.ts# Composite refund router
│   │   │   └── access/
│   │   │       └── payment-port.adapter.ts             # Updated createIntent to return redirectUrl
│   │   ├── presentation/
│   │   │   └── http/
│   │   │       ├── payment-gateway.controller.ts       # Public callbacks and IPN webhooks
│   │   │       └── dto/
│   │   │           └── gateway-callback.dto.ts         # Callback DTOs
│   │   └── payment.module.ts                           # Module DI wiring
```
