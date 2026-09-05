# Data Model & Schema Design: Local Bangladesh Payment Gateways

**Feature**: `002-bangladesh-payments`  
**Date**: 2026-09-05

## 1. Domain Entities & Value Objects

### 1.1 `PaymentIntent` Aggregate Extensions
- **Status Lifecycle**:
  ```text
  [For COD]
  AWAITING_COLLECTION ──> COLLECTED
                      ├──> CANCELLED
                      └──> EXPIRED / FAILED

  [For Gateway: SSLCOMMERZ | BKASH | NAGAD]
  REQUIRES_PAYMENT    ──> CAPTURED
                      ├──> CANCELLED
                      └──> EXPIRED / FAILED
  ```
- **New Aggregate State**:
  - `providerTransactionId: string | null` (e.g., bKash `trxID`, SSLCommerz `bank_tran_id`, Nagad `trxId`)
  - `gatewayReferenceId: string | null` (e.g., bKash `paymentID`, SSLCommerz `val_id`, Nagad `paymentRefId`)
  - `capturedAt: Date | null`
  - Method `markCaptured(providerTransactionId: string, gatewayReferenceId?: string)`:
    - Validates status is `REQUIRES_PAYMENT`.
    - Updates status to `CAPTURED`, records timestamps and provider identifiers.
    - Appends domain event `PaymentCaptured`.

### 1.2 `PaymentTransaction` Entity
Stores transaction evidence for both COD cash collection and digital gateway capture:
- `id: uuid`
- `paymentIntentId: uuid`
- `orderId: uuid`
- `collectorUserId: uuid` (for COD: staff user ID; for gateways: `00000000-0000-0000-0000-000000000000` system actor)
- `amountMinor: integer`
- `currencyCode: string(3)`
- `note: text | null` (e.g., `bKash trxID: TRX123456; status: Completed`)
- `idempotencyKey: string(180)` (unique index)
- `collectedAt: Date`
- `createdAt: Date`

### 1.3 `PaymentOutbox` Events
- Event type: `PaymentCaptured`
- Version: `1`
- Payload:
  ```json
  {
    "paymentIntentId": "uuid",
    "orderId": "uuid",
    "vendorId": "uuid",
    "storeId": "uuid",
    "paymentMethod": "BKASH",
    "provider": "BKASH",
    "amountMinor": 150000,
    "currencyCode": "BDT",
    "providerTransactionId": "TRX987654321",
    "capturedAt": "2026-09-05T10:00:00.000Z"
  }
  ```

---

## 2. In-Memory / Distributed Caches (Redis)

### 2.1 Replay Guard Keys
- Key pattern: `payment:replay:{provider}:{providerTransactionId}`
- TTL: `86400` seconds (24 hours)
- Value: `CAPTURED`

### 2.2 bKash Token Cache
- Key pattern: `payment:bkash:id_token`
- TTL: `3500` seconds (58 minutes, token valid for 1 hour)
- Value: `<id_token>`

---

## 3. Schema & Migration Changes

Because `PaymentIntentOrmEntity` and `PaymentTransactionOrmEntity` already have extensible columns and `PaymentRefundOrmEntity` already has `provider_refund_id`, `provider_response_code`, and `provider_received_at`, we can add:
- Add nullable `provider_transaction_id` and `gateway_reference_id` to `payment_intents`.
- Add `captured_at` timestamp to `payment_intents`.
All additions are strictly non-breaking and additive with default nulls.
