# Production Implementation Phases

## Project

Multi-Vendor, Multi-Store E-Commerce Platform

### Architecture

- Modular Monolith
- Domain-Driven Design (DDD)
- Clean Architecture
- SOLID Principles
- PostgreSQL (Shared Database + Row Level Security)
- MikroORM (Data Mapper Pattern)
- Redis (Caching, Dynamic Throttling, Session Store)
- BullMQ (Distributed Queueing & Background Workers)
- Next.js App Router (Server-Side Rendering for SEO)
- NestJS (Enterprise Modular Framework)
- TypeScript Strict Mode

> This roadmap contains 31 numbered delivery phases: Phase 00 plus Phases 01-30.
> Phase numbers are identifiers, not a promise that every phase is completed in one release.

## Required sequencing

The following dependencies override the numeric order when a phase requires a contract from a later phase:

```text
Foundation
-> Identity and authentication
-> Tenant/vendor/store authorization
-> Persistence, migrations, and transaction helpers
-> Vendor and store management
-> Catalog
-> Inventory
-> Pricing and promotions
-> Cart
-> Order and payment contracts
-> Checkout orchestration
-> Outbox and workers
```

Checkout must not be implemented against an undeclared Order or Payment contract. Define those contracts and their state machines before implementing the checkout use case, even though the roadmap keeps the capability sections grouped separately.

## Repository layout

```text
backend/src/          # NestJS modular monolith (domain → application → infrastructure)
frontend/src/         # Next.js App Router storefront and portals
docs/PHASES.md        # This roadmap
docs/module/          # Bounded-context specifications
.env.example          # Required environment contract (no secrets committed)
scripts/validate.mjs  # Local quality gate pipeline
```

Do not use legacy paths such as `src/modules/` at the repository root or `apps/web/`.

---

# Phase 00 — Foundation & Repository Setup

## Objective

Establish a deterministic, reproducible development environment and unified repository workspace structures.

### Backend

- [x] NestJS application framework bootstrap.
- [x] Enable absolute TypeScript strict mode compilation.
- [x] Implement central typed AppConfig service.
- [x] Enforce environment variables runtime validation using Zod.
- [x] Integrate Pino structured fast JSON logging format.
- [x] Configure AsyncLocalStorage context middleware for Correlation ID tracking.
- [x] Set up global ValidationPipe with transformed error formatting.
- [x] Create RFC 7807 compliant unified Global Exception Filter.
- [x] Integrate Swagger/OpenAPI via @nestjs/swagger metadata plugins.
- [x] Add Terminus database, Redis, and disk space health check routes.
- [x] Wire process handlers for clean app graceful shutdown.
- [x] Dockerize isolated backend development runtime configurations.

### Frontend

- [x] Scaffold Next.js enterprise directory layout using App Router.
- [x] Enable absolute strict TypeScript type checking targets.
- [x] Initialize Tailwind CSS config with modular styling themes.
- [x] Setup shadcn/ui framework and primitive base styles.
- [x] Configure Radix primitive underlying accessible layout states.
- [x] Build global TanStack Query configuration cache managers.
- [x] Establish client Zustand store structure patterns.
- [x] Build dynamic, type-safe Axios/Fetch API client wrapper.
- [x] Implement localized Error Boundary fallback components.

### Infrastructure

- [x] Deploy local PostgreSQL database container image configurations.
- [x] Spin up localized Redis cache layer broker containers.
- [x] Install local Meilisearch engines for development testing.
- [x] Provision MinIO instances for localized S3-compatible asset management.
- [x] Assemble orchestrated multi-container root Docker Compose assets.
- [x] Document strict production-to-local environment configuration templates (see `.env.example`, `OPERATIONS.md`).

### Quality Gates

Run from repository root: `npm.cmd run validate` (Windows) or `npm run validate` (Unix).

- [x] `npm.cmd run format:check` — All tracked source and documentation uses repository formatting.
- [x] `npm.cmd run lint` — No ESLint errors.
- [x] `npm.cmd run typecheck` — Backend and frontend strict compilation checks pass.
- [x] `npm.cmd run architecture` — Layer and module boundary checks pass.
- [x] `npm.cmd run test` — Unit tests pass (integration/API/E2E expand in later phases).
- [x] `npm.cmd run security` — No unresolved **critical** production dependency vulnerabilities (`--audit-level=critical`). High/moderate transitive advisories in Next.js build tooling are tracked for upgrade in Phase 27.
- [x] `npm.cmd run build` — Successful deployable backend and frontend compilation.
- [x] `npm.cmd run migration:check` — Migrations apply on a clean database in CI; skipped locally when PostgreSQL is unavailable.

### Exit Criteria

Phase 00 is complete when:

1. Backend serves `/api/v1/health/live` and `/api/v1/health/ready`.
2. Frontend Next.js App Router builds and renders a root page.
3. `docker compose up` starts PostgreSQL, Redis, Meilisearch, and MinIO locally.
4. `npm.cmd run validate` passes on a clean checkout (CI enforces migration apply against PostgreSQL).

### Pre-work in later phases (not Phase 00 exit)

Domain models for Identity, Catalog, and POS exist ahead of their API phases. They do not satisfy Phase 01, 05, or POS delivery exit criteria until application, infrastructure, API, auth, persistence, and tests land.

Every later phase must repeat the relevant gates and add measurable exit criteria for authorization, persistence, failure behavior, observability, and rollback. A checked feature list alone does not complete a phase.

---

# Phase 01 — Identity, Authentication & Authorization

## Objective

Build the complete system-wide secure identity boundary foundation prior to executing business core services.

### Identity

- [x] Design pure User domain Aggregate Root boundaries.
- [x] Implement secure time-ordered Unique ID value objects (`shared-kernel`).
- [x] Create strict regex Email value objects.
- [x] Code custom complex Password policy structural requirements.
- [x] Define comprehensive operational lifecycle User Status states (`pending`, `active`, `locked`, `disabled`).
- [x] Map explicit methods tracking domain account history mutations.

### Authentication

- [x] Write Registration use-case processing pipelines.
- [x] Build standard secure login controller route structures.
- [x] Code Session Logout token invalidation routines.
- [x] Configure stateless short-lived Access JWT signatures.
- [x] Set up secure state HTTP-only Refresh cookies (opaque tokens, SHA-256 hashes in Redis).
- [x] Code custom dynamic Refresh Token Rotation validations.
- [x] Build Redis-backed Refresh Token Revocation tracking.
- [x] Wire active automated Token Family reuse fraud protection engines.
- [x] Configure multi-pass Argon2id high-security cryptographic hashing strategies.
- [x] Isolate domain model internal password verification methods (application `PasswordHasher` port + Argon2 adapter).
- [x] Code structural authenticated user Password Change utilities.
- [x] Design dynamic temporary Forgot Password tracking flows (Redis reset tokens; email delivery deferred).
- [x] Construct validated transactional token Account Reset operations.

### Optional Authentication

- [ ] Build Google OAuth OpenID Connect registration endpoints.
- [ ] Integrate Facebook OAuth secure login credential parsers.
- [ ] Create dedicated local mobile carrier transactional OTP login layers.
- [ ] Implement email Verification activation tracking tokens.
- [ ] Configure optional Multi-Factor Authentication TOTP generator apps.

### Authorization

- [x] Construct base security Access Role definitions.
- [x] Map discrete contextual feature granular Permissions lists.
- [x] Build static Role-Permission lookup mapping structures.
- [x] Program unified application-wide dynamic Permission Guard interceptors.
- [ ] Build advanced declarative resource Access Policy compilation engines.
- [ ] Enforce automated runtime resource tenant Ownership validation criteria (Phase 02).

### Roles

```text
PLATFORM_ADMIN
VENDOR_OWNER
VENDOR_STAFF
STORE_MANAGER
STORE_STAFF
CUSTOMER
```

### Security Tests

- [x] Invalid credentials
- [x] Expired access token (JWT guard rejects expired bearer tokens)
- [x] Expired refresh token
- [x] Refresh token reuse
- [x] Revoked token
- [x] Wrong role
- [x] Missing permission
- [ ] Privilege escalation attempt (ownership-scoped policies — Phase 02+)
- [x] Rate limiting
- [x] Brute-force protection (failed-login lockout + Redis login rate limiter)

### Exit Criteria

- [x] Authentication and authorization are usable by every future bounded context (`IdentityModule` exports guards, token signer, and user repository ports; `/api/v1/auth/*` live).

---

# Phase 02 — Multi-Tenancy & Security Isolation

## Objective

Establish hard tenant/vendor/store isolation before exposing business data.

### Tenant Context

- [x] AsyncLocalStorage request context
- [x] Authenticated principal
- [x] Vendor context
- [x] Store context
- [x] Platform context
- [x] Request ID

### PostgreSQL

- [x] RLS foundation (`app` schema helpers + sample tenant-scoped table)
- [x] Tenant policies (`user_memberships` self-read + platform bypass)
- [x] Vendor policies (`tenant_isolation_samples` vendor match)
- [x] Store policies (store-scoped rows restricted to assigned store)
- [x] Transaction-local context (`SET LOCAL` via `applyRlsSessionVariables` + subscriber)
- [x] RLS helper functions (`app.current_*`, `app.is_platform_scope`)

### Authorization Hierarchy

```text
Platform
   ↓
Vendor
   ↓
Store
   ↓
Store resources
```

### Security Tests

- [x] Vendor A cannot read Vendor B
- [x] Vendor A cannot modify Vendor B
- [x] Store A cannot access Store B
- [x] Store manager cannot escape assigned store
- [x] Customer cannot access vendor resources
- [x] Platform admin explicit access
- [x] RLS bypass attempts fail (integration test when Postgres available)

### Exit Criteria

- [x] Cross-tenant data access is impossible through normal application paths (`TenancyModule`, scope interceptor, RLS session variables, and policy unit tests).

---

# Phase 03 — Vendor Management

## Objective

Implement vendor onboarding and vendor lifecycle.

### Vendor Aggregate

- [x] Vendor entity
- [x] Vendor ID
- [x] Vendor status
- [x] Vendor profile
- [x] Business information
- [x] Contact information
- [x] Vendor settings

### Lifecycle

```text
PENDING
   ↓
UNDER_REVIEW
   ↓
APPROVED
   ↓
ACTIVE
   ↓
SUSPENDED
```

Also: `REJECTED` (from pending/under_review) and reopen to `PENDING`.

### Features

- [x] Vendor registration
- [x] Vendor onboarding (submit for review)
- [x] Admin approval
- [x] Vendor rejection
- [x] Vendor suspension
- [x] Vendor activation
- [x] Vendor staff
- [x] Vendor roles (`VENDOR_OWNER` / `VENDOR_STAFF` on staff + identity role grant)
- [x] Vendor permissions (`vendor.manage` for platform admin paths; owner-scoped mutations)

### Events

```text
VendorCreated
VendorSubmittedForReview
VendorApproved
VendorRejected
VendorActivated
VendorSuspended
VendorStaffAdded
VendorStaffRemoved
```

### Tests

- [x] Vendor ownership
- [x] Admin authorization
- [x] Staff permissions (last-owner protection + owner-only staff mutations)
- [x] Lifecycle transitions

### Exit Criteria

- [x] Vendor aggregate, lifecycle, staff model, HTTP API, RLS migration, and membership/role sync are implemented.

---

# Phase 04 — Store Management

## Objective

Allow each vendor to operate multiple stores.

### Store

- [x] Store aggregate
- [x] Store ID
- [x] Vendor ownership
- [x] Store slug
- [x] Store status
- [x] Store settings
- [x] Store timezone
- [x] Store currency
- [x] Store address
- [x] Store staff

### Store Lifecycle

```text
DRAFT
  ↓
ACTIVE
  ↓
SUSPENDED
  ↓
CLOSED
```

### Features

- [x] Create store
- [x] Update store
- [x] Activate store
- [x] Suspend store
- [x] Store staff assignment
- [x] Store permissions

### Tests

- [x] Vendor isolation
- [x] Store ownership
- [x] Staff access
- [x] Store lifecycle

### Exit Criteria

- [x] `StoreModule` under `backend/src/modules/store/` with RLS on `stores` / `store_staff`, membership sync, and HTTP under `/api/v1/stores/*`.

---

# Phase 05 — Catalog

## Objective

Build a scalable product/catalog domain.

### Product

- [x] Product aggregate
- [x] Product ID
- [x] SKU
- [x] Product name
- [x] Description
- [x] Brand
- [x] Category
- [x] Attributes
- [x] Media
- [x] Status

### Product Variants

- [x] Canonical Variant ID and Product ID relationship
- [x] Variant name and status
- [x] Normalized, stable, unique Variant SKU
- [x] Barcode, GTIN, EAN, UPC, MPN, and manufacturer reference
- [x] Catalog price metadata with integer minor units and currency
- [x] Typed variant attributes and unique combinations
- [x] Variant media and thumbnail fallback
- [x] Tax/shipping classification references and external references
- [x] UTC created/updated timestamps

### Store Offers

Separate:

```text
Product
     ↓
Store Offer
     ↓
Price / Inventory / Availability
```

This allows one vendor product to be offered differently by different stores.

- [x] Store offer aggregate (store + variant price/availability; inventory remains Phase 06)

### Categories

- [x] Category tree
- [x] Parent/child categories
- [x] Slugs
- [x] SEO metadata

### Media

- [x] Media metadata references on products/variants (IDs + ordering)
- [ ] S3/R2 binary upload pipeline — deferred to Media module / `.cursor/rules/38-media-uploads.mdc`
- [ ] Signed URLs — deferred to Media module
- [ ] Upload validation — deferred to Media module

### Tests

- [x] Vendor ownership
- [x] Store ownership (store offers)
- [x] SKU uniqueness
- [x] Variant uniqueness
- [x] Product lifecycle

### Exit Criteria

- [x] `CatalogModule` with products, variants, categories, store offers, RLS migration, and HTTP under `/api/v1/products|variants|categories|store-offers`.

---

# Phase 06 — Inventory

## Objective

Implement concurrency-safe inventory management.

### Inventory

- [x] Inventory item
- [x] Warehouse
- [x] Stock quantity
- [x] Reserved quantity
- [x] Available quantity
- [x] Low-stock threshold

### Operations

- [x] Stock receive
- [x] Stock adjustment
- [x] Stock transfer
- [x] Stock reservation
- [x] Reservation release
- [x] Reservation expiration
- [x] Stock deduction

### Concurrency

Use:

```text
database transaction
+ row lock / optimistic concurrency
+ constraint validation
```

Redis must not be the source of inventory truth.

### Events

```text
InventoryAdjusted
InventoryReserved
InventoryReleased
InventoryDepleted
```

Also emitted: `StockTransferred`, `StockDeducted`, `ReservationExpired` (domain events; durable outbox is Phase 12).

### Tests

- [x] Concurrent reservation (unit serialization + integration when `DATABASE_URL` is set)
- [x] Overselling prevention
- [x] Reservation expiry
- [x] Wrong vendor
- [x] Wrong store

---

# Phase 07 — Pricing & Promotion

## Objective

Create one authoritative pricing engine.

### Pricing

- [x] Base price
- [x] Sale price
- [x] Currency
- [x] Tax
- [x] Shipping
- [x] Discount
- [x] Commission

### Promotions

- [x] Coupons
- [x] Percentage discount
- [x] Fixed discount
- [x] Minimum order amount
- [x] Product-specific promotion
- [x] Category promotion
- [x] Vendor promotion
- [x] Store promotion
- [x] Usage limits
- [x] Expiration

### Rule

The browser never determines the final price.

```text
Frontend price = display hint
Backend price  = authoritative
```

### Tests

- [x] Discount calculation
- [x] Coupon validation
- [x] Expiration
- [x] Usage limits
- [x] Vendor restrictions
- [x] Store restrictions
- [x] Currency handling

### Exit Criteria

- [x] `PricingModule` with promotions, authoritative `POST /api/v1/pricing/quote`, usage recording, RLS migration, and `PRICING_PORT`.

---

# Phase 08 — Cart

## Objective

Support unified multi-vendor shopping carts.

### Cart

- [x] Cart aggregate
- [x] Cart item
- [x] Quantity
- [x] Store
- [x] Vendor
- [x] Product
- [x] Variant
- [x] Price snapshot

### Cart Operations

- [x] Add item
- [x] Remove item
- [x] Update quantity
- [x] Clear cart
- [x] Validate cart
- [x] Recalculate cart

### Multi-Vendor

Example:

```text
Cart
 ├── Vendor A
 │    └── Store A
 │         ├── Product 1
 │         └── Product 2
 │
 └── Vendor B
      └── Store B
           └── Product 3
```

### Tests

- [x] Quantity validation
- [x] Product availability
- [x] Price changes
- [x] Inventory changes
- [x] Multi-vendor cart
- [x] Vendor isolation

### Exit Criteria

- [x] `CartModule` with multi-vendor lines, validate/recalculate via Catalog + Inventory + Pricing ports, guest/customer ownership, RLS migration.

---

# Phase 09 — Checkout

## Objective

Create an atomic and authoritative checkout pipeline.

### Checkout

- [x] Address
- [x] Shipping method
- [x] Tax
- [x] Discounts
- [x] Shipping fee
- [x] Commission
- [x] Grand total

### Validation

At checkout:

```text
validate user
→ validate cart
→ validate products
→ validate prices
→ validate inventory
→ validate promotions
→ calculate totals
→ reserve inventory
→ create order
→ create payment intent
```

### Idempotency

Checkout submission must support `Idempotency-Key`.

Repeated requests must not create duplicate orders.

### Tests

- [x] Price change
- [x] Stock change
- [x] Coupon failure
- [x] Duplicate request
- [x] Concurrent checkout
- [x] Multi-vendor checkout

### Exit Criteria

- [x] `CheckoutModule` with `POST /api/v1/checkout/submit`, idempotent submissions, inventory reservation + compensate, multi-vendor order split via `ORDER_PORT` / `PAYMENT_PORT` (temporary adapters until Phases 10–11).

---

# Phase 10 — Orders

## Objective

Build the central order domain.

### Order

- [x] Order aggregate
- [x] Order number
- [x] Customer
- [x] Vendor
- [x] Store
- [x] Order lines
- [x] Price snapshots
- [x] Tax snapshot
- [x] Shipping snapshot
- [x] Address snapshot
- [x] Payment status
- [x] Fulfillment status

### State Machine

```text
PENDING_PAYMENT
       ↓
PAID
       ↓
PROCESSING
       ↓
PARTIALLY_FULFILLED
       ↓
FULFILLED
       ↓
COMPLETED
```

Failure paths:

```text
PENDING_PAYMENT → PAYMENT_FAILED
PAID            → CANCELLED
PAID            → REFUND_REQUESTED
FULFILLED       → RETURN_REQUESTED
```

No arbitrary status mutation.

### Tests

- [x] Valid transitions
- [x] Invalid transitions
- [x] Cancellation
- [x] Partial fulfillment
- [x] Refund
- [x] Return

### Exit Criteria

- [x] `OrderModule` with state machine, immutable snapshots, RLS migration, HTTP under `/api/v1/orders`, and real `ORDER_PORT` (replacing checkout stub).

---

# Phase 11 — Payment

## Objective

Create provider-independent payment infrastructure, including **online Cash on Delivery (COD)**.

### Provider Port

```text
PaymentPort
  ├── createIntent(paymentMethod, orderId, ...)
  ├── confirmCodCollection(...)
  └── cancelIntent(...)
```

Gateway providers (SSLCommerz / bKash / Nagad) remain stubbed behind method-aware intents (`REQUIRES_PAYMENT` + optional `clientSecret`).

### Online COD (shipped)

- [x] Payment module (`payment_intents`, `payment_transactions`, `payment_operations`, `payment_outbox`)
- [x] COD statuses: `AWAITING_COLLECTION` → `COLLECTED` (also `CANCELLED` / `FAILED` / `EXPIRED`)
- [x] Checkout `paymentMethod` + eligibility (vendor/store `codEnabled`, min/max, address)
- [x] One COD intent **per store order**; no `clientSecret` for COD
- [x] `CollectCodPayment` + `POST /api/v1/payments/cod/:paymentIntentId/collect` + `payment.cod.collect`
- [x] Exact amount match; idempotent collect; order `markPaid` only via Payment port
- [x] COD inventory reservation TTL (default 72h) separate from gateway short TTL
- [x] Minimal same-transaction `payment_outbox` rows (`CodPaymentCreated`, `CodCollected`) — dispatcher is Phase 12

### Providers (live adapters later)

- [ ] SSLCommerz
- [ ] bKash
- [ ] Nagad

### Payment

- [x] Payment intent
- [x] Payment transaction (COD collection record)
- [ ] Provider reference (gateway)
- [x] Amount / currency / status
- [ ] Callback / webhook
- [ ] Refund

### Security

- [x] Idempotency
- [x] Amount verification (COD collect)
- [x] Currency verification
- [x] Order verification via Payment → Order port
- [ ] Signature validation (gateways)
- [ ] Replay protection (gateways)

### Critical Rule

Never:

```text
frontend success redirect → order PAID
storefront → Order.markPaid()
```

Instead (gateway):

```text
provider callback
→ verify
→ transaction
→ mark payment
→ mark order
→ outbox
```

Instead (COD):

```text
Checkout(COD) → AWAITING_COLLECTION → unpaid order
→ (optional) PROCESSING / fulfillment by policy
→ CollectCodPayment → COLLECTED → Order.markPaid() → outbox
```

COD is **not** POS till `CASH`.

---

# Phase 12 — Transactional Outbox & BullMQ

## Objective

Make asynchronous processing durable.

### Outbox

- [x] Outbox tables (`payment_outbox`, `fulfillment_outbox` — written with business TX)
- [x] Aggregate ID
- [x] Event type
- [x] Payload
- [x] Event version
- [x] Created timestamp
- [x] Published timestamp
- [x] Retry count (dispatch attempts; migration `Migration20250824300000`)

### Dispatcher

```text
DB transaction
    ↓
Outbox
    ↓
Dispatcher (MessagingModule poll + SKIP LOCKED)
    ↓
BullMQ
    ↓
Consumer (idempotent Redis NX by outbox id)
```

- [x] `MessagingModule` polls unpublished rows and enqueues with `jobId = outbox.id`
- [x] Marks `published_at` after successful enqueue; increments `retry_count` on failure
- [x] Exhausted dispatch → `octopus.dead-letter` queue
- [ ] Dedicated outbox metrics/dashboard (ops later)

### Queues (names reserved; workers expand later)

- [x] Domain events (`octopus.domain-events`) — log + dedupe consumer
- [x] Payment (`octopus.payment`) — COD event consumer (idempotent; side effects later)
- [ ] Email (`octopus.email`)
- [ ] Notification (`octopus.notification`)
- [ ] Search indexing (`octopus.search-indexing`)
- [ ] Webhooks (`octopus.webhooks`)
- [ ] Payout (`octopus.payout`)
- [ ] Analytics (`octopus.analytics`)
- [x] Dead-letter (`octopus.dead-letter`)

### Reliability

- [x] Retry policy (BullMQ attempts + exponential backoff)
- [x] Exponential backoff
- [x] Dead-letter handling (dispatch exhausted + failed jobs retained)
- [x] Idempotent consumers (Redis `outbox:processed:{id}` NX)
- [ ] Queue metrics (Prometheus/OpenTelemetry later)
- [ ] Fulfillment status poller worker (Phase 13 sync API exists; poller still deferred)

Config: `OUTBOX_DISPATCH_ENABLED`, `OUTBOX_POLL_INTERVAL_MS`, `OUTBOX_BATCH_SIZE`, `OUTBOX_MAX_DISPATCH_RETRIES`.

Product baselines (Martvill / Expo / Cloudflare / Hostinger / printers): [docs/product/current-baseline.md](./product/current-baseline.md), [docs/product/ux-parity.md](./product/ux-parity.md).

---

# Phase 13 — Shipping & Fulfillment

## Objective

Support vendor/store fulfillment with multi-courier delivery (Steadfast, Pathao, MANUAL).

### Shipment

- [x] Shipment aggregate + shipment lines
- [x] Carrier provider (`STEADFAST` | `PATHAO` | `MANUAL`)
- [x] Tracking / consignment ids
- [x] Shipping status machine

### Status

```text
PENDING
PROCESSING
SHIPPED
IN_TRANSIT
OUT_FOR_DELIVERY
DELIVERED
FAILED
RETURNED
```

### Courier integrations (v1)

- [x] `CourierPort` (shared-kernel) + status normalization
- [x] Steadfast Packzy: create_order + status_by_*
- [x] Pathao Aladdin: OAuth issue/refresh + create order + order info
- [x] Per-vendor encrypted credentials + Pathao OAuth token store
- [x] COD: `amount_to_collect` / `cod_amount` from PaymentIntent; on DELIVERED → `confirmCodCollectionFromFulfillment`
- [ ] Bulk create / returns / price-plan UI (deferred)
- [ ] Phase 12 status poller worker (sync endpoint shipped; worker deferred)

### Features

- [x] Vendor/store staff create shipment (`POST /api/v1/fulfillment/shipments`)
- [x] Partial line quantities on shipment
- [x] Status sync pull (`POST .../sync-status`)
- [x] Delivery confirmation → COD collect seam
- [ ] Return shipment (Phase 14)

---

# Phase 14 — Refunds & Returns

## Objective

Post-purchase returns and refunds with explicit separation:

```text
RETURN ≠ REFUND ≠ INVENTORY RESTORATION ≠ PAYMENT ≠ LEDGER
```

Coordinate via ports/outbox. Do not mutate Payment/Inventory tables from Return handlers.

### 14.1 — Returns domain (this slice)

- [x] Return request aggregate + items (historical price snapshot)
- [x] Controlled return reasons
- [x] State machine: REQUESTED → … → INSPECTION_* / REJECTED / CANCELLED
- [x] Partial returns + returnable quantity
- [x] Return window (default 7 days from fulfillment proxy timestamp)
- [x] Approve / reject / receive / inspect / cancel
- [x] Vendor/store/customer isolation + RBAC
- [x] `returns_outbox` + Phase 12 dispatcher
- [x] Unit tests (creation, qty, isolation, transitions)
- [x] No automatic refund on request

### 14.2 — Refunds (Payment-owned)

- [x] Refund aggregate / max refundable / partial+full
- [x] COD refund methods (no fake refund if uncollected)
- [x] Idempotency + concurrent over-refund safety
- [x] Gateway refund port (+ stub until live adapters)

### 14.3 — Inventory restoration

- [x] `InventoryPort` restore-from-return (after inspection accept)
- [x] Sellable vs non-sellable disposition (extend Inventory; no parallel stock)
- [x] Idempotent restore

### 14.4 — Ledger hook

- [x] Outbox `RefundCompleted` allocation payload
- [x] LedgerPort stub until Phase 15 (no duplicate ledger)

### Deferred

- Category/product return policy (platform/vendor/store settings later)
- Live SSLCommerz/bKash/Nagad refund webhooks
- Customer/vendor return UIs (Phase 18 / 20)
- Return courier shipment

Product baselines: [docs/product/current-baseline.md](./product/current-baseline.md).

---

# Phase 15 — Vendor Financial Ledger & Payouts

## Objective

Immutable vendor ledger as financial truth. Materialized balances are derived only.

**Stack (Octopus):** NestJS + **MikroORM** + **PostgreSQL** — not Prisma/MySQL. Redis/BullMQ = cache/queues only.

**Prereqs:** Phase 11 COD/payment intents · Phase 12 outbox · Phase 14.1 returns · prefer **14.2 refunds** before refund ledger posts (else stub `LedgerPort` consumers).

### Core model

```text
CREDIT  SALE
DEBIT   COMMISSION
DEBIT   REFUND
CREDIT/DEBIT  ADJUSTMENT (audited)
DEBIT   PAYOUT
```

Never `vendor.balance` as authority. Never UPDATE/DELETE ledger rows — reverse with new entries.

### 15.1 — Ledger + balances

- [ ] `vendor_ledger_entries` append-only (+ unique reference constraints)
- [ ] Types: SALE, COMMISSION, REFUND, ADJUSTMENT, PAYOUT
- [ ] Record sale + commission from **order pricing snapshot** on eligible recognition event (COD: only after `COLLECTED` / paid)
- [ ] Pending vs available (configurable settlement window; default explicit)
- [ ] `rebuildVendorBalance` + optional snapshot table
- [ ] RBAC: `finance.ledger.read` (+ existing `payout.*` until renamed)
- [ ] Vendor/store isolation + RLS
- [ ] Outbox: `VendorSaleRecorded`, `CommissionRecorded`

### 15.2 — Payouts

- [ ] `VendorPayout` state machine: REQUESTED → … → COMPLETED | FAILED
- [ ] Request ≤ available; concurrent over-payout impossible (TX + lock/version)
- [ ] Approve / reject / process (provider port stub OK)
- [ ] COMPLETED → single `DEBIT PAYOUT` (idempotent)
- [ ] Failure releases reservation; no silent double debit

### 15.3 — Adjustments + reconciliation

- [ ] Platform-only financial adjustments (reason + audit)
- [ ] Reconciliation report (derived vs snapshot, orphan refs) — report only, no auto-fix
- [ ] Vendor statement query (server-side pagination)

### 15.4 — Refund / commission integration + UI hooks

- [ ] Consume `RefundCompleted` → `DEBIT REFUND` + proportional commission credit
- [ ] Admin/vendor finance read APIs (dashboard numbers from backend)
- [ ] FE surfaces deferred with Phase 20 / vendor portal — API-first

### Deferred

- Live bank/bKash payout providers · payment-provider fee ledger · tax-as-liability ledger · closed accounting periods · CSV/PDF export · full E2E UI

### Rules

- Commission amounts from order snapshot (`commissionMinor` / `commissionRateBps`) — do not reprice
- Uncollected COD → no SALE credit
- POS `CASH` ≠ online COD (POS stays out of vendor ledger)
- Prefer OSS/self-hosted; no paid finance SaaS required

Docs: [docs/module/payout.md](./module/payout.md), [docs/domains/commissions.md](./domains/commissions.md).

---

# Phase 16 — Search

## Objective

Async Meilisearch **read model**. PostgreSQL/domain remains truth (not MySQL). Redis/BullMQ = transport only.

**Prereqs:** Phase 12 Messaging · Catalog `StoreOffer` + Product · Inventory availability ports.  
**Gap to close first:** Catalog domain events exist but are **not yet written to an outbox** — add `catalog_outbox` (same pattern as payment/returns) before indexing works.

### Index unit (Octopus-specific)

Prefer indexing **sellable store offers** (product + variant + store + vendor + price), not a bare Product row — marketplace search is offer-scoped.

### 16.1 — Contracts + Meilisearch adapter

- [x] `ProductSearchIndexPort` (index/update/delete/search)
- [x] Meilisearch adapter + index settings (searchable/filterable/sortable)
- [x] Env: existing `MEILISEARCH_*` + `SEARCH_PRODUCTS_INDEX` (default `products`)
- [x] Document: offerId/productId/variantId/vendorId/storeId/priceMinor/currency/availability/status — no cost/private fields
- [x] Skip rating/reviewCount until reviews exist
- [x] `GET /api/v1/search/products` (read against Meili; empty until 16.2 indexes)

### 16.2 — Catalog outbox → `octopus.search-indexing`

- [ ] Persist catalog/offer events to `catalog_outbox`
- [ ] Dispatcher routes to search queue (Phase 12 name already reserved)
- [ ] Worker loads authoritative offer/product; upsert or delete; idempotent by document id
- [ ] Out-of-order guard via `updatedAt` / aggregate version
- [ ] Inventory signal → availability field only (checkout still revalidates Inventory)

### 16.3 — Search API + reindex

- [ ] `GET /api/v1/search/products` allowlisted filters (q, category, vendor, store, price, availability, sort, page)
- [ ] Facets transformed to app DTO (not raw Meili)
- [ ] Admin `POST /admin/search/reindex` → queued batches (not inline HTTP)
- [ ] Storefront context: store/vendor scope from server, not client trust

### Deferred

- Reviews-based ranking · popularity · marketing facets · full E2E UI (Phase 18) · sync status dashboard polish

### Rule

Meilisearch never mutates Catalog/Inventory. Search availability is informational.

Docs: [docs/module/search.md](./module/search.md).

---

# Phase 17 — Notifications

## Objective

Centralized async notifications. Domain modules emit events; Notification delivers.

**Prereqs:** Phase 12 outbox/queues · Identity users · Order/Payment/Fulfillment events (as they exist).  
Prefer **OSS/free**: SMTP (or console stub in dev); SMS/push adapters stubbed until a free/cheap BD provider is chosen.

### 17.1 — Core + in-app + email stub

- [ ] Notification aggregate + delivery attempts + idempotency `(eventId, recipientId, type, channel)`
- [ ] Templates (`key`, `channel`, `locale` en/bn) + version on send
- [ ] `EmailProviderPort` (SMTP or log stub)
- [ ] In-app persistence + `GET /notifications`, unread, mark-read
- [ ] Queue `octopus.notification` (name reserved) + retry/DLQ

### 17.2 — Event consumers (transactional)

- [ ] Wire existing outbox events: account/order/payment/shipment/COD as available
- [ ] Preference gate (marketing optional; security/transactional mandatory)
- [ ] Recipient resolution in Notification module (minimal PII in events)

### 17.3 — SMS / Push ports (adapters stub)

- [ ] `SmsProviderPort` / `PushProviderPort` + device registry schema
- [ ] Real providers later — no paid SaaS required for skeleton

### Deferred

- Marketing campaigns · abandoned cart · full admin notification center UI · provider webhooks · Firebase unless free tier chosen explicitly

### Rules

- No business logic in Notification · no double-send · no secrets in logs · vendor/customer isolation on in-app feeds

Docs: [docs/module/notification.md](./module/notification.md).

---

# Phase 18 — Customer Experience

## Objective

Customer-facing storefront on Next.js App Router. Backend remains authoritative for price, stock, discounts, tax, shipping, totals, and payment status.

**Stack:** Next 15 + Nest `api/v1` + **PostgreSQL** (not MySQL). Search via Nest only (never Meilisearch from the browser).

**Prereqs:** Cart/checkout/auth/orders/returns APIs · Phase 14.1 returns · Phase 16.1 search (16.2 for filled index) · no storefront mark-paid.

### 18.1 — Storefront API foundation

- [ ] Public catalog/PLP/PDP/category/store-by-slug (`@Public`, published only)
- [ ] `@Public` search (allowlisted filters)
- [ ] Guest → customer **cart merge** (server-side)
- [ ] Customer module: profile + address book (owner-scoped)
- [ ] Public media URL for thumbnails
- [ ] Docs: `customer.md` / `marketplace.md` aligned

### 18.2 — Browse shell (frontend)

- [ ] `(storefront)` layout (header/nav/footer)
- [ ] Homepage (section shells + Settings/public config — not Phase 20.3 CMS)
- [ ] Category / store / PLP / PDP / search
- [ ] URL-addressable filters; RSC for SEO pages; client islands for variants/cart

### 18.3 — Cart + checkout + COD UX

- [ ] Cart UI; checkout; COD eligibility from backend only
- [ ] Multi-store order success; idempotency headers; no client grand totals

### 18.4 — Customer account

- [ ] Auth pages (login/register; Identity cookies — not `?token=`)
- [ ] `/account` profile, addresses, orders, order detail, returns
- [ ] Refunds display when Payment refunds exist (14.2+)

### 18.5 — SEO + resilience

- [ ] Metadata, canonical, sitemap, robots, Product/Breadcrumb JSON-LD (no fake ratings)
- [ ] 404 / unavailable / checkout failure / mobile-first pass

### Deferred (not Phase 18 blockers)

- Wishlist · product reviews · in-app notifications (Phase 17) · flash/best-seller engines · WebSockets · Website CMS (20.3)

Related: [customer.md](./module/customer.md), [marketplace.md](./module/marketplace.md), [product/ux-parity.md](./product/ux-parity.md), [frontend.md](./frontend.md) (Nike section = reference only).

---

# Phase 19 — Vendor Portal

## Objective

Build complete vendor operations.

### Dashboard

- [ ] Sales
- [ ] Orders
- [ ] Revenue
- [ ] Customers
- [ ] Inventory
- [ ] Payouts

### Catalog

- [ ] Products
- [ ] Variants
- [ ] Categories
- [ ] Media
- [ ] Pricing

### Inventory

- [ ] Stock
- [ ] Adjustments
- [ ] Transfers
- [ ] Low-stock alerts

### Orders

- [ ] Pending
- [ ] Processing
- [ ] Fulfillment
- [ ] Shipping
- [ ] Returns

### Finance

- [ ] Ledger
- [ ] Commission
- [ ] Statements
- [ ] Payouts

### Multi-Store

- [ ] Store switcher
- [ ] Store permissions
- [ ] Store-specific catalog
- [ ] Store inventory
- [ ] Store reports

---

# Phase 20 — Platform Admin

## Objective

Build the platform admin **presentation layer** over existing bounded contexts
(see [`docs/admin-dashboard.md`](admin-dashboard.md)). Do not create a god
`PlatformAdmin` domain. Ship in slices 20.1–20.8.

### Ownership model

- Next.js App Router shell under `frontend/src/app/(admin)/admin/`
- Thin HTTP adapters at `/api/v1/admin/*` calling existing handlers/ports
- New modules only where missing: **settings**, **media**, **cms** (later), **audit**
- Scope from JWT + tenancy context; ignore body/URL tenant ids for authz
- Effective storefront config (when Website Control Center ships): single
  `GET /api/v1/storefront/config` resolving Platform→Vendor→Store server-side

---

## Phase 20.1 — Foundation

- [x] Granular `platform.*` / `settings.*` / `audit.read` / `media.*` / `website.*` permissions
- [x] Admin shell: sidebar, scope badge, permission-aware nav
- [x] Routes: `/admin/dashboard`, `/admin/vendors`, `/admin/stores`, `/admin/system/health`
- [x] Settings module: typed `configuration_documents` + `resolveEffective` (Platform→Vendor→Store)
- [x] Media module stub: MediaId metadata (`media_assets`); no public URL as truth
- [x] Audit module skeleton: append-only `audit_events` with secret redaction
- [x] Admin read APIs over existing Vendor/Store (`GET /admin/vendors`, `GET /admin/stores`)
- [x] Additive migration for configuration/media/audit tables + RLS
- [x] Unit tests: settings inheritance, vendor-owner deny on platform settings, store IDOR harness

### Explicit non-goals for 20.1

- Full CMS page builder / menu drag-drop / SEO center
- Printers / registers / barcode hardware
- Payouts / refunds / commission engine
- Arbitrary visual website builder
- Parallel auth system

---

## Phase 20.2 — Vendor / Store admin ops

- [ ] Admin UI + thin admin APIs for vendor lifecycle (approve/suspend) over existing handlers
- [ ] Store lifecycle admin surfaces
- [ ] Optional verification document fields (when domain supports them)
- [ ] Vendor/store staff management from admin shell

---

## Phase 20.3 — Website Control Center _(deferred)_

**Deferred until Settings + Media + CMS are ready.** Do not start page builder work
in parallel with unfinished 20.1/20.2 foundation.

When unblocked:

- [ ] Branding / theme / nav / footer / CMS pages + SEO
- [ ] Draft → publish + versioning
- [ ] Preview + `GET /api/v1/storefront/config` effective inheritance endpoint
- [ ] Redis cache for effective config only; DB remains truth

---

## Phase 20.4 — Commerce config surfaces

Ship admin UIs **only after** owning domain modules exist:

- [ ] Payment provider / COD admin surfaces (Payment + store/vendor COD settings)
- [ ] Shipping / courier account admin surfaces (Fulfillment)
- [ ] Tax / commission admin surfaces (dedicated engines or later phases)

---

## Phase 20.5 — POS admin

- [ ] Registers / printers / barcode after POS domain expands beyond receipts
- [ ] Receipt template management remains store-scoped (already started)

---

## Phase 20.6 — Operations lists

- [ ] Orders / payments / inventory / users admin lists via existing modules
- [ ] No duplicate business rules in the admin BFF

---

## Phase 20.7 — Security dashboard

- [ ] Login history
- [ ] Security events (align with Phase 22 audit expansion)

---

## Phase 20.8 — Reports entry

- [ ] Operational counts from existing APIs where safe
- [ ] Analytical widgets deferred to Phase 21 read models

---

# Phase 21 — Reporting & Analytics

## Objective

Build read-optimized reporting.

### Reports

- [ ] Sales
- [ ] Orders
- [ ] Revenue
- [ ] Commission
- [ ] Vendor performance
- [ ] Store performance
- [ ] Product performance
- [ ] Inventory
- [ ] Customer
- [ ] Refund
- [ ] Payout

### Architecture

Do not execute expensive analytical queries against transactional endpoints.

```text
Transactional DB
      ↓
Events
      ↓
Read models / reporting tables
      ↓
Analytics
```

---

# Phase 22 — Audit & Compliance

## Objective

Make sensitive business operations traceable.

### Audit Events

- [ ] Login
- [ ] Logout
- [ ] Failed login
- [ ] Password change
- [ ] Vendor approval
- [ ] Vendor suspension
- [ ] Product changes
- [ ] Inventory adjustments
- [ ] Order cancellation
- [ ] Refund
- [ ] Payout
- [ ] Permission changes
- [ ] Admin actions

### Audit Record

```text
actor
action
resource
resourceId
tenant
vendor
store
timestamp
requestId
before
after
metadata
```

Never store secrets in audit records.

---

# Phase 23 — Observability

## Objective

Make the production system diagnosable.

### Logging

- [ ] Pino
- [ ] JSON logs
- [ ] Request ID
- [ ] Trace ID
- [ ] Actor ID
- [ ] Vendor ID
- [ ] Store ID
- [ ] Operation
- [ ] Duration
- [ ] Error code

### OpenTelemetry

- [ ] HTTP traces
- [ ] PostgreSQL traces
- [ ] Redis traces
- [ ] BullMQ traces
- [ ] Payment provider traces
- [ ] Search traces

### Metrics

- [ ] Request latency
- [ ] Error rate
- [ ] DB latency
- [ ] Redis latency
- [ ] Queue depth
- [ ] Queue lag
- [ ] Checkout success
- [ ] Payment failures
- [ ] Inventory conflicts
- [ ] Search indexing lag
- [ ] Payout failures

### Sentry

- [ ] Backend errors
- [ ] Frontend errors
- [ ] Release tracking
- [ ] Sensitive data filtering

---

# Phase 24 — Performance & Scalability

## Objective

Optimize based on real measurements.

### Database

- [ ] Query analysis
- [ ] Index review
- [ ] N+1 elimination
- [ ] Connection pool tuning
- [ ] Pagination
- [ ] Lock analysis

### Redis

- [ ] Cache strategy
- [ ] Cache invalidation
- [ ] TTL policy
- [ ] Rate limiting
- [ ] Queue optimization

### API

- [ ] Response compression
- [ ] Pagination
- [ ] Request limits
- [ ] Query limits
- [ ] Slow query detection

### Next.js

- [ ] Server Components
- [ ] Streaming
- [ ] Image optimization
- [ ] Route caching
- [ ] Client bundle analysis

### Rule

Never optimize by weakening correctness.

---

# Phase 25 — Security Hardening

## Objective

Perform a dedicated security pass.

### Application Security

- [ ] Helmet
- [ ] CORS
- [ ] CSRF strategy
- [ ] Rate limiting
- [ ] Input validation
- [ ] Output encoding
- [ ] SSRF protection
- [ ] File upload security

### Authentication

- [ ] Token rotation
- [ ] Session revocation
- [ ] Password policy
- [ ] MFA
- [ ] Brute-force protection

### Authorization

- [ ] RBAC
- [ ] Permission checks
- [ ] Ownership checks
- [ ] Tenant isolation
- [ ] RLS

### Payments

- [ ] Webhook signature verification
- [ ] Replay protection
- [ ] Idempotency
- [ ] Amount verification
- [ ] Currency verification

### Secrets

- [ ] Secret manager
- [ ] Key rotation
- [ ] No secrets in Git
- [ ] No secrets in logs

---

# Phase 26 — Automated Testing

## Objective

Reach production-grade test coverage.

### Domain

- [ ] Aggregates
- [ ] Value objects
- [ ] Policies
- [ ] State machines
- [ ] Pricing
- [ ] Commission
- [ ] Inventory

### Application

- [ ] Authorization
- [ ] Transactions
- [ ] Idempotency
- [ ] Outbox
- [ ] Error handling

### Integration

- [ ] PostgreSQL
- [ ] RLS
- [ ] Redis
- [ ] BullMQ
- [ ] MikroORM
- [ ] Payment adapters

### API

- [ ] Authentication
- [ ] Authorization
- [ ] Validation
- [ ] Pagination
- [ ] Error contracts

### E2E

- [ ] Registration
- [ ] Login
- [ ] Browse
- [ ] Search
- [ ] Cart
- [ ] Multi-vendor checkout
- [ ] Payment
- [ ] Order tracking
- [ ] Vendor fulfillment
- [ ] Refund
- [ ] Payout

---

# Phase 27 — CI/CD

## Objective

Prevent defective code from reaching production.

### Pull Request

```text
format
↓
lint
↓
typecheck
↓
architecture checks
↓
unit tests
↓
integration tests
↓
security audit
↓
migration validation
↓
build
```

### Deployment

```text
build image
↓
security scan
↓
push image
↓
database migration
↓
deploy
↓
readiness check
↓
smoke tests
↓
monitor
```

### Deployment Strategies

- [ ] Rolling deployment
- [ ] Blue/green where appropriate
- [ ] Canary where appropriate
- [ ] Automatic rollback
- [ ] Forward recovery

---

# Phase 28 — Infrastructure as Code

## Objective

Make production infrastructure reproducible.

### Infrastructure

- [ ] VPC/network
- [ ] PostgreSQL
- [ ] Redis
- [ ] Object storage
- [ ] Application runtime
- [ ] Load balancer
- [ ] DNS
- [ ] TLS
- [ ] Secrets
- [ ] Monitoring
- [ ] Backups

### IaC

Choose one:

- Terraform
- Pulumi

### Environments

```text
development
staging
production
```

Never share production secrets with development.

---

# Phase 29 — Backup & Disaster Recovery

## Objective

Prove the system can recover.

### Database

- [ ] Automated backups
- [ ] Point-in-time recovery
- [ ] Backup encryption
- [ ] Retention policy
- [ ] Restore testing

### Redis

Define what data is reconstructable and what is not.

Redis must not contain the only copy of financial/business truth.

### Object Storage

- [ ] Versioning
- [ ] Lifecycle policy
- [ ] Backup strategy

### Recovery

- [ ] RTO defined
- [ ] RPO defined
- [ ] Disaster recovery runbook
- [ ] Restore drill

---

# Phase 30 — Production Readiness Review

### Architecture

- [ ] No forbidden cross-module imports
- [ ] Domain has no infrastructure dependencies
- [ ] Application layer has no ORM dependencies
- [ ] Infrastructure implements ports
- [ ] Modules own their data
- [ ] Cross-module communication is explicit

### Security

- [ ] RLS tested
- [ ] RBAC tested
- [ ] Permissions tested
- [ ] Secrets protected
- [ ] Webhooks secured
- [ ] Rate limiting enabled
- [ ] CORS restricted

### Financial

- [ ] Money uses integer minor units
- [ ] Payment callbacks idempotent
- [ ] Refunds idempotent
- [ ] Commission deterministic
- [ ] Payout ledger immutable
- [ ] Financial history auditable

### Inventory

- [ ] Reservation transactional
- [ ] Overselling prevented
- [ ] Concurrency tested
- [ ] Reservation expiration implemented

### Reliability

- [ ] Outbox enabled
- [ ] Queue retry policy
- [ ] Dead-letter handling
- [ ] Idempotent consumers
- [ ] Graceful shutdown
- [ ] Health checks

### Observability

- [ ] Logs
- [ ] Metrics
- [ ] Traces
- [ ] Error monitoring
- [ ] Alerts
- [ ] Dashboards

### Testing

- [ ] Unit
- [ ] Integration
- [ ] API
- [ ] E2E
- [ ] Security
- [ ] Concurrency
- [ ] Migration

### Operations

- [ ] Backups
- [ ] Restore tested
- [ ] Deployment tested
- [ ] Rollback tested
- [ ] Incident runbooks
- [ ] Monitoring alerts

## Definition of Production Ready

The platform is considered production-ready only when:

```text
Architecture
+ Security
+ Tenant Isolation
+ Business Correctness
+ Financial Correctness
+ Inventory Correctness
+ Testing
+ Observability
+ Operational Recovery
+ CI/CD
= Production Readiness
```

Passing a build is NOT sufficient.

A feature is complete only when its:

```text
Domain
+ Application
+ Infrastructure
+ API
+ Authorization
+ Persistence
+ Events
+ Tests
+ Observability
+ Documentation
```

are complete.

---

# Appendix — Cursor Execution Rule

When implementing any phase:

1. Read the applicable `.cursor/rules/*.mdc`.
2. Inspect existing module boundaries.
3. Do not rewrite unrelated modules.
4. Implement domain behavior first.
5. Define application ports.
6. Implement infrastructure adapters.
7. Add presentation/API layer.
8. Add authorization.
9. Add database migration.
10. Add unit tests.
11. Add integration tests where required.
12. Add API tests.
13. Update documentation.
14. Run architecture validation.
15. Run typecheck.
16. Run lint.
17. Run tests.
18. Run build.
19. Fix failures before moving to the next phase.
