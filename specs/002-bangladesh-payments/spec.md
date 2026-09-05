# Feature Specification: Local Bangladesh Payment Gateways (SSLCommerz, bKash, Nagad)

**Feature Branch**: `002-bangladesh-payments`

**Created**: 2026-09-05

**Status**: Draft

**Input**: User choices from Grill round:
- Q1 = A: Build all three gateways (SSLCommerz, bKash Tokenized Checkout, Nagad Direct) behind a unified `PaymentGatewayPort` / `PaymentProviderAdapter` architecture.
- Q2 = A: Hosted gateway redirection with server-side validation.
- Q3 = A: Dual-mode adapters (Live HTTP with Mock / Simulation fallback when credentials absent or in mock mode).
- Q4 = A: Database transaction + Redis replay guard + Outbox event + secondary provider server-to-server validation query.
- Q5 = A: Integrated gateway refund execution dispatching to the respective provider adapter.

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Hosted Gateway Checkout Session Initiation (Priority: P1)

As a customer checking out on the storefront with an online payment method (SSLCommerz, bKash, or Nagad),
I want the checkout service to initiate a hosted payment session and provide a valid redirect URL,
So that I can securely authenticate with my bank or MFS provider to authorize the payment.

**Why this priority**:
Initiating a payment session and securing a provider-issued redirect URL is the indispensable entry point for all online digital transactions in Bangladesh.

**Independent Test**:
Can be fully tested by creating an order with `paymentMethod='SSLCOMMERZ' | 'BKASH' | 'NAGAD'` via checkout and verifying that a `PaymentIntent` in `REQUIRES_PAYMENT` is returned along with a valid `redirectUrl` to the provider gateway.

**Acceptance Scenarios**:

1. **Given** an approved checkout session with valid BDT amount and `paymentMethod='BKASH'`,
   **When** checkout calls `PaymentPort.createIntent`,
   **Then** a `PaymentIntent` aggregate is created with status `REQUIRES_PAYMENT`, provider `BKASH`, and a gateway session is initialized returning a redirect URL (`redirectUrl`), which is passed back to the caller.
2. **Given** an approved checkout session with `paymentMethod='SSLCOMMERZ'`,
   **When** checkout calls `PaymentPort.createIntent`,
   **Then** SSLCommerz session initiation API is called with internal transaction ID, customer contact info, and amount, returning the SSLCommerz gateway URL (`GatewayPageURL`).
3. **Given** an approved checkout session with `paymentMethod='NAGAD'`,
   **When** checkout calls `PaymentPort.createIntent`,
   **Then** Nagad payment initialization is invoked with merchant signature, returning Nagad's payment callback URL.

---

### User Story 2 - Gateway Verification & Replay-Protected Capture (Priority: P1)

As the commerce platform,
When a gateway webhook, IPN, or return callback is received from SSLCommerz, bKash, or Nagad,
I want to perform secondary server-to-server validation, enforce Redis replay prevention, verify exact monetary match, and transition the payment intent to `CAPTURED`,
So that the customer's order is authoritatively marked paid without trusting client redirects or being susceptible to double-charge replay attacks.

**Why this priority**:
Critical financial correctness rule (`.cursor/rules/08-payments-finance.mdc`, `.cursor/rules/09-payments-bangladesh.mdc`, `.cursor/rules/37-order-payment.mdc`): Never mark an order paid based on frontend redirects or unverified webhooks.

**Independent Test**:
Can be fully tested by sending a payment gateway callback/IPN payload, verifying that the secondary verification query runs, exact `amountMinor` and `currencyCode` match, `PaymentTransactionOrmEntity` is recorded with provider transaction ID, `OrderPort.markPaidFromPayment` is invoked, and `PaymentCaptured` event is written to `payment_outbox`.

**Acceptance Scenarios**:

1. **Given** a payment intent in `REQUIRES_PAYMENT` for 1,500.00 BDT (`amountMinor=150000`),
   **When** a successful bKash callback is received with `paymentID` and `trxID`,
   **Then** the bKash execute-payment API is called server-to-server, Redis replay lock verifies uniqueness of `trxID`, the amount is confirmed, status is updated to `CAPTURED`, order is marked paid via `OrderPort`, and `PaymentCaptured` outbox event is persisted.
2. **Given** an SSLCommerz validation request with `val_id` and `tran_id`,
   **When** server-to-server validation API confirms `VALID` or `VALIDATED` and amount matches,
   **Then** transaction evidence is persisted and order status transitions to `PAID`.
3. **Given** a duplicate webhook payload delivered multiple times by the payment gateway network,
   **When** processed,
   **Then** the second and subsequent invocations are intercepted by the Redis idempotency guard/lock, returning HTTP 200 without duplicate ledger mutations or order state alterations.

---

### User Story 3 - Payment Failure, Cancellation & Expiry (Priority: P2)

As a customer who decides to cancel or fails payment authentication at the gateway,
I want the platform to record the failed or cancelled state appropriately,
So that my cart/order status reflects the failure and allows me to retry without corrupted or locked states.

**Why this priority**:
Prevents dangling payment intents, handles user drop-offs, and correctly adheres to order payment lifecycle.

**Independent Test**:
Can be tested by sending a gateway cancel/fail callback and verifying that the `PaymentIntent` status transitions to `CANCELLED` or `FAILED` without calling `OrderPort.markPaidFromPayment`.

**Acceptance Scenarios**:

1. **Given** a customer cancels at the bKash or SSLCommerz payment screen,
   **When** the provider redirects to the cancel URL with status `CANCEL`,
   **Then** the payment intent is transitioned to `CANCELLED`, order remains in `PENDING_PAYMENT`, and the customer is redirected to the retry screen.
2. **Given** an invalid PIN or insufficient balance during Nagad payment,
   **When** Nagad returns a `FAILED` callback,
   **Then** the payment intent is transitioned to `FAILED` and recorded in payment transactions.

---

### User Story 4 - Dual-Mode Gateway Adapters (Sandbox/Live & Deterministic Mock Fallback) (Priority: P2)

As a developer or automated CI pipeline without active bank credentials,
I want the payment gateway infrastructure to operate in mock mode when credentials are missing or `PAYMENT_GATEWAY_MODE=sandbox-mock`,
So that 100% of the unit, integration, and e2e test suites can run deterministically without external bank dependencies.

**Why this priority**:
Ensures local development and repository CI (`npm.cmd run validate`) never fail due to external network latency or missing secrets.

**Independent Test**:
Can be tested by executing full gateway flows with mock credentials and confirming that mock redirect URLs and deterministic test callbacks succeed.

**Acceptance Scenarios**:

1. **Given** `BKASH_APP_KEY` or `SSLCOMMERZ_STORE_ID` are not set in the environment,
   **When** a payment intent is created,
   **Then** the adapter automatically logs a diagnostic message and provides a deterministic simulation redirect URL.
2. **Given** live or sandbox credentials configured in `.env`,
   **When** the adapter initializes,
   **Then** it signs and dispatches requests to the real gateway endpoints.

---

### User Story 5 - Gateway Refund Execution (Priority: P3)

As a platform admin or authorized vendor processing an approved return,
I want refund requests on captured gateway payments to call the respective gateway's refund API (bKash, Nagad, or SSLCommerz),
So that the customer's original account or card is refunded directly and the provider's refund reference is stored in `payment_refunds`.

**Why this priority**:
Completes the end-to-end accounting loop and prevents manual reconciliation friction for customer returns.

**Independent Test**:
Can be tested by calling `CreateRefundHandler` on a captured gateway payment intent and verifying that the provider's refund endpoint is invoked, remaining refundable amount is decremented, and `PaymentRefundOrmEntity` stores the gateway's refund transaction ID.

**Acceptance Scenarios**:

1. **Given** an order paid via bKash with original `trxID`,
   **When** a refund of 500.00 BDT is executed,
   **Then** bKash refund API is called with `paymentID`, `trxID`, `amount`, and `sku`, returning a `refundTrxID` that is stored on `PaymentRefundOrmEntity`.

---

## Edge Cases

- **Currency mismatch**: A gateway returns USD or EUR instead of BDT -> Rejection with `InvalidPaymentMoneyError` and alert.
- **Amount mismatch**: A gateway validates payment with an amount differing from the internal intent amount by even 1 paisa -> Transaction flagged as `FAILED_AMOUNT_MISMATCH`, alert triggered, order NOT marked paid.
- **Double execution**: Gateway webhook arrives while customer is returning on browser redirect -> Redis distributed mutex ensures only one execution thread verifies and mutates database state.
- **Network timeout during gateway verification**: Call fails before receiving verification response -> Transaction left in `REQUIRES_PAYMENT`, background reconciliation / retry worker will poll status.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST support `SSLCOMMERZ`, `BKASH`, and `NAGAD` as first-class `PaymentMethod` values alongside `COD`.
- **FR-002**: System MUST define a provider-agnostic `PaymentGatewayPort` interface with methods: `initializeSession(intent)`, `verifyPayment(payload)`, and `refund(intent, refund)`.
- **FR-003**: System MUST provide concrete adapters: `SslCommerzGatewayAdapter`, `BkashGatewayAdapter`, and `NagadGatewayAdapter`.
- **FR-004**: System MUST expose public callback/webhook endpoints:
  - `POST /api/v1/payments/gateways/sslcommerz/callback`
  - `POST /api/v1/payments/gateways/sslcommerz/ipn`
  - `POST /api/v1/payments/gateways/bkash/callback`
  - `POST /api/v1/payments/gateways/nagad/callback`
- **FR-005**: System MUST perform secondary server-to-server verification against the gateway before marking any payment captured.
- **FR-006**: System MUST verify exact `amountMinor` and `currencyCode` match between the gateway verification payload and internal `PaymentIntent`.
- **FR-007**: System MUST guard against replay attacks using Redis key checks on `(provider, providerTransactionId)`.
- **FR-008**: System MUST persist provider transaction ID, status, and raw response payload in `PaymentTransactionOrmEntity`.
- **FR-009**: System MUST update `PaymentIntent` status to `CAPTURED`, invoke `OrderPort.markPaidFromPayment`, and persist `PaymentCaptured` event to `payment_outbox` in the same database transaction.
- **FR-010**: System MUST support automated gateway refunds through `PaymentGatewayRefundDispatcher` implementing `PaymentRefundGatewayPort`.
- **FR-011**: System MUST fall back to deterministic mock simulation when provider credentials are unset or when `PAYMENT_GATEWAY_MODE=sandbox-mock`.

### Key Entities

- **`PaymentIntent`**: Existing aggregate extended to support `CAPTURED` status and gateway reference fields.
- **`PaymentTransaction`**: Entity storing the gateway audit trail (`providerTransactionId`, `gatewayStatusCode`, `rawResponseJson`, `amountMinor`, `currencyCode`).
- **`PaymentRefund`**: Entity storing gateway refund details (`providerRefundId`, `amountMinor`, `reason`).
- **`PaymentGatewayPort`**: Domain port abstracting gateway session initiation, verification, and refund execution.

---

## Success Criteria _(mandatory)_

- **SC-001**: 100% of successful gateway verifications result in the associated order transitioning to `PAID` without manual intervention.
- **SC-002**: 0 duplicate payments or double charges are allowed through the Redis replay prevention layer.
- **SC-003**: 100% of unit and integration test suites pass in offline/mock mode without requiring real external banking credentials.
- **SC-004**: Full end-to-end typecheck, linting, and build pass with exit code 0.
