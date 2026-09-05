# Tasks: Local Bangladesh Payment Gateways (SSLCommerz, bKash, Nagad)

**Input**: Design documents from `/specs/002-bangladesh-payments/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story identifier (US1, US2, US3, US4, US5)
- Exact file paths included in all descriptions.

---

## Phase 1: Setup & Foundational Prerequisites

**Purpose**: Core model, aggregate, and port updates that all payment user stories depend on.

- [x] T001 [P] Extend `PaymentIntentStatus` in `backend/src/modules/payment/domain/payment.types.ts` with `'CAPTURED'`, and add `providerTransactionId`, `gatewayReferenceId`, and `capturedAt` columns to `PaymentIntentOrmEntity` in `backend/src/modules/payment/infrastructure/persistence/payment.orm-entity.ts`.
- [x] T002 [P] Implement `markCaptured(providerTransactionId: string, gatewayReferenceId?: string)` on `PaymentIntent` aggregate in `backend/src/modules/payment/domain/aggregates/payment-intent.aggregate.ts` emitting `PaymentCaptured`.
- [x] T003 [P] Define `PaymentGatewayPort` in `backend/src/modules/payment/domain/ports/payment-gateway.port.ts` (`initializeSession`, `verifyPayment`, `refundPayment`).
- [x] T004 [P] Update `CreatePaymentIntentResult` in `backend/src/shared-kernel/application/ports/payment.port.ts` to include optional `redirectUrl: string`.

---

## Phase 2: User Story 1 - Hosted Gateway Session Initiation (Priority: P1) 🎯 MVP Core

**Goal**: Storefront checkout initiates a payment intent and receives a valid gateway redirect URL for SSLCommerz, bKash, or Nagad.

### Tests for User Story 1

- [x] T005 [P] [US1] Unit tests in `backend/src/modules/payment/infrastructure/gateways/payment-gateways.spec.ts` verifying session initialization for SSLCommerz, bKash, and Nagad.

### Implementation for User Story 1

- [x] T006 [US1] Implement `SslCommerzGatewayAdapter` in `backend/src/modules/payment/infrastructure/gateways/sslcommerz-gateway.adapter.ts`.
- [x] T007 [US1] Implement `BkashGatewayAdapter` in `backend/src/modules/payment/infrastructure/gateways/bkash-gateway.adapter.ts`.
- [x] T008 [US1] Implement `NagadGatewayAdapter` in `backend/src/modules/payment/infrastructure/gateways/nagad-gateway.adapter.ts`.
- [x] T009 [US1] Update `CreatePaymentIntentHandler` and `PaymentPortAdapter` in `backend/src/modules/payment/infrastructure/access/payment-port.adapter.ts` to initialize gateway sessions and return `redirectUrl`.

---

## Phase 3: User Story 2 - Gateway Verification & Replay-Protected Capture (Priority: P1)

**Goal**: Authoritatively verify payment callbacks/IPNs server-to-server, prevent replay loops via Redis, transition intent to `CAPTURED`, mark order paid, and write outbox event.

### Tests for User Story 2

- [x] T010 [P] [US2] Integration test in `backend/src/modules/payment/presentation/http/payment-gateway.controller.spec.ts` verifying bKash, SSLCommerz, and Nagad callbacks and IPNs.

### Implementation for User Story 2

- [x] T011 [US2] Implement `ProcessGatewayCallbackHandler` in `backend/src/modules/payment/application/commands/payment-gateway.handlers.ts` verifying exact amount/currency, Redis replay lock, order paid invocation, and outbox event persistence.
- [x] T012 [US2] Expose callback and IPN routes in `backend/src/modules/payment/presentation/http/payment-gateway.controller.ts`.

---

## Phase 4: User Story 3 - Payment Failure, Cancellation & Expiry (Priority: P2)

**Goal**: Gracefully handle user cancellation and payment failures without corrupted order state.

### Tests for User Story 3

- [x] T013 [P] [US3] Unit test in `backend/src/modules/payment/application/commands/payment-gateway.handlers.spec.ts` proving cancel and fail callbacks transition intent to `CANCELLED` or `FAILED`.

### Implementation for User Story 3

- [x] T014 [US3] Add cancel and failure callback handlers in `backend/src/modules/payment/application/commands/payment-gateway.handlers.ts`.

---

## Phase 5: User Story 4 - Dual-Mode Gateway Adapters (Sandbox/Live & Deterministic Mock Fallback) (Priority: P2)

**Goal**: Ensure all gateway adapters fall back to deterministic mock simulation when credentials are unset or `PAYMENT_GATEWAY_MODE=sandbox-mock`.

### Tests for User Story 4

- [x] T015 [P] [US4] Unit test in `backend/src/modules/payment/infrastructure/gateways/payment-gateways.spec.ts` proving adapters default to simulated mock responses without external network access.

### Implementation for User Story 4

- [x] T016 [US4] Implement simulated fallback mode in `SslCommerzGatewayAdapter`, `BkashGatewayAdapter`, and `NagadGatewayAdapter`.

---

## Phase 6: User Story 5 - Gateway Refund Execution (Priority: P3)

**Goal**: Dispatch refund requests to the original gateway adapter and record provider refund references.

### Tests for User Story 5

- [x] T017 [P] [US5] Unit test in `backend/src/modules/payment/infrastructure/gateways/payment-gateway-refund-dispatcher.spec.ts` verifying gateway refund routing for bKash, Nagad, and SSLCommerz.

### Implementation for User Story 5

- [x] T018 [US5] Implement `PaymentGatewayRefundDispatcher` in `backend/src/modules/payment/infrastructure/gateways/payment-gateway-refund-dispatcher.ts` and replace `StubPaymentRefundGateway`.

---

## Phase 7: Polish & Full Verification

- [x] T019 Register all gateway adapters, handlers, and controllers in `backend/src/modules/payment/payment.module.ts`.
- [x] T020 Run lint, typecheck, vitest tests, and validation gate.
