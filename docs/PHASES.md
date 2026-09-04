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

### Slice 04.1 — Store onboarding & provisioning

- [x] Extended lifecycle (`provisioning`, `failed`, `maintenance`, `archived`)
- [x] Store code, type, contact, geo fields
- [x] Store outbox + domain events
- [x] Onboarding draft API (`store_onboarding_drafts`)
- [x] Provisioning saga (`store_provisioning_runs` / `store_provisioning_steps`)
- [x] Cross-module provisioner ports (settings, inventory, POS, stubs)
- [x] Vendor 17-step wizard UI
- [x] Admin provisioning monitor on store detail
- [x] Docs: `docs/module/store-provisioning.md`

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
- [x] Notification (`octopus.notification`)
- [x] Search indexing (`octopus.search-indexing`)
- [ ] Webhooks (`octopus.webhooks`)
- [x] Payout (`octopus.payout`)
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

- [x] `vendor_ledger_entries` append-only (+ unique reference constraints)
- [x] Types: SALE, COMMISSION, REFUND, ADJUSTMENT, PAYOUT
- [x] Record sale + commission from **order pricing snapshot** on eligible recognition event (COD: only after `COLLECTED` / paid)
- [x] Pending vs available (configurable settlement window; default explicit)
- [x] `rebuildVendorBalance` + optional snapshot table
- [x] RBAC: `finance.ledger.read` (+ existing `payout.*` until renamed)
- [x] Vendor/store isolation + RLS
- [x] Outbox: `VendorSaleRecorded`, `CommissionRecorded`

### 15.2 — Payouts

- [x] `VendorPayout` state machine: REQUESTED → … → COMPLETED | FAILED
- [x] Request ≤ available; concurrent over-payout impossible (TX + lock/version)
- [x] Approve / reject / process (provider port stub OK)
- [x] COMPLETED → single `DEBIT PAYOUT` (idempotent)
- [x] Failure releases reservation; no silent double debit

### 15.3 — Adjustments + reconciliation

- [x] Platform-only financial adjustments (reason + audit)
- [x] Reconciliation report (derived vs snapshot, orphan refs) — report only, no auto-fix
- [x] Vendor statement query (server-side pagination)

### 15.4 — Refund / commission integration + UI hooks

- [x] Consume `RefundCompleted` → `DEBIT REFUND` + proportional commission credit
- [x] Admin/vendor finance read APIs (dashboard numbers from backend)
- [x] FE surfaces deferred with Phase 20 / vendor portal — API-first

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

- [x] Persist catalog/offer events to `catalog_outbox`
- [x] Dispatcher routes to search queue (Phase 12 name already reserved)
- [x] Worker loads authoritative offer/product; upsert or delete; idempotent by document id
- [x] Out-of-order guard via `updatedAt` / aggregate version
- [x] Inventory signal → availability field only (checkout still revalidates Inventory)

### 16.3 — Search API + reindex

- [x] `GET /api/v1/search/products` allowlisted filters (q, category, vendor, store, price, availability, sort, page)
- [x] Facets transformed to app DTO (not raw Meili)
- [x] Admin `POST /admin/search/reindex` → queued batches (not inline HTTP)
- [x] Storefront context: store/vendor scope from server, not client trust

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

- [x] Notification aggregate + delivery attempts + idempotency `(eventId, recipientId, type, channel)`
- [x] Templates (`key`, `channel`, `locale` en/bn) + version on send
- [x] `EmailProviderPort` (SMTP or log stub)
- [x] In-app persistence + `GET /notifications`, unread, mark-read
- [x] Queue `octopus.notification` (name reserved) + retry/DLQ

### 17.2 — Event consumers (transactional)

- [x] Wire existing outbox events: account/order/payment/shipment/COD as available
- [x] Preference gate (marketing optional; security/transactional mandatory)
- [x] Recipient resolution in Notification module (minimal PII in events)

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

- [x] Public catalog/PLP/PDP/category/store-by-slug (`@Public`, published only)
- [x] `@Public` search (allowlisted filters)
- [x] Guest → customer **cart merge** (server-side)
- [x] Customer module: profile + address book (owner-scoped)
- [x] Public media URL for thumbnails
- [x] Docs: `customer.md` / `marketplace.md` aligned

### 18.2 — Browse shell (frontend)

- [x] `(storefront)` layout (header/nav/footer)
- [x] Homepage (section shells + Settings/public config — not Phase 20.3 CMS)
- [x] Category / store / PLP / PDP / search
- [x] URL-addressable filters; RSC for SEO pages; client islands for variants/cart

### 18.3 — Cart + checkout + COD UX

- [x] Cart UI; checkout; COD eligibility from backend only
- [x] Multi-store order success; idempotency headers; no client grand totals

### 18.4 — Customer account

- [x] Auth pages (login/register; Identity cookies — not `?token=`)
- [x] `/account` profile, addresses, orders, order detail, returns
- [x] Refunds display when Payment refunds exist (14.2+)

### 18.5 — SEO + resilience

Gap analysis (full engine vs repo): [engineering/seo-gap-analysis.md](./engineering/seo-gap-analysis.md).  
**Do not** ship keyword/AI/GSC/mass landing pages here — rule-based serve first after 18.1–18.2.

- [x] Metadata, canonical, sitemap, robots, Product/Breadcrumb JSON-LD (no fake ratings)
- [x] Category manual SEO respected; product/store fallbacks + templates (no overwrite of manual)
- [x] Facet/query URLs noindex or canonical to clean category (default strict)
- [x] 404 / unavailable / checkout failure / mobile-first pass

### Deferred (not Phase 18 blockers)

- Wishlist · product reviews · in-app notifications (Phase 17) · flash/best-seller engines · WebSockets · Website CMS (20.3)
- Full SEO center (keywords, health scanner, opportunities, AI drafts) — see seo-gap-analysis P2–P5 / marketing M8

### 18.6 — Growth / measurement (after 18.3)

GTM + GA4 + Meta Pixel/CAPI + attribution. Tags are **sinks only** (PostgreSQL domain = truth). Plan: [docs/module/marketing.md](./module/marketing.md).

**Prereqs:** 18.3 checkout · 17.2 marketing consent · order outbox (`OrderPaid` outboxed).

- [x] Public marketing config (GTM/GA4/Pixel IDs; secrets server-only; env isolation)
- [x] ConsentManager + centralized TrackingService / dataLayer (no per-component DIY)
- [x] Order attribution snapshot (utm / gclid / fbclid); first + last touch
- [x] Server `purchase`/`refund` via outbox → GA4 MP + Meta CAPI; `transaction_id` / `event_id` dedupe
- [x] COD authoritative `purchase` only on `CodCollected`
- [x] `item_id` / `content_ids` = variant **SKU** (ponytail: variantId until Order line stores sku)
- [x] Admin Settings → Marketing (Meta, GA, GTM via settings key; Ads/Consent UI thin) + `marketing_events` audit

SEO metadata/sitemap: Phase **18.5** ([seo-gap-analysis.md](./engineering/seo-gap-analysis.md)). Keyword registry + Search Console UI: later (marketing.md M8).  
First-party funnel/AOV/acquisition dashboards: Phase **21** (not GA4 as accounting).

Deferred: vendor-owned tags · ROAS without ad spend · wishlist events · COD risk engine.

Related: [customer.md](./module/customer.md), [marketplace.md](./module/marketplace.md), [product/ux-parity.md](./product/ux-parity.md), [frontend.md](./frontend.md) (Nike section = reference only).

---

# Phase 19 — Vendor Portal

## Objective

Build complete vendor operations.

### 19.1 — Foundation

Thin Next.js vendor ops shell over **existing** authenticated APIs (sessionStorage
access token via `ensureAccessToken` / `authedRequest` — never `?token=`). Routes
under `frontend/src/app/(vendor)/vendor/`.

- [x] Vendor shell (auth gate → `/login?next=…`, sidebar nav)
- [x] Vendor picker (`GET /vendors/mine`; single-vendor redirect; thin register form)
- [x] Store switcher (`sessionStorage` `octopus.vendor.selectedStoreId`)
- [x] Dashboard (vendor status/name + finance summary cards + store count)
- [x] Stores list (`GET /stores?vendorId=`)
- [x] Store orders list (`GET /orders/stores/:storeId`) + minimal order detail
      (start-processing / complete)
- [x] Catalog products list (`GET /products?vendorId=`)
- [x] Finance summary / ledger / payouts read
      (`GET /finance/vendors/:vendorId/{summary,ledger,payouts}`)

Deferred (later Phase 19 slices): returns UI, multi-store reports, payout request UI,
low-stock alert UI, etc. Catalog mutations: see 19.3; Martvill-style editor: 19.6.

### 19.2 — Inventory

Store-scoped inventory UI over existing `GET`/`POST /inventory/stores/:storeId/*`
APIs (session auth via `authedRequest`). Route:
`/vendor/[vendorId]/inventory`.

- [x] Warehouses list + create (`GET`/`POST …/warehouses`)
- [x] Stock lookup (`GET …/availability?variantId=`)
- [x] Ensure item (`POST …/items`, optional low-stock threshold)
- [x] Receive (`POST …/receive` with client `crypto.randomUUID()` idempotency)
- [x] Adjust (`POST …/adjust` with idempotency key)
- [x] Transfer when ≥2 warehouses (`POST …/transfer` with idempotency key)
- [x] Store inventory nav link in vendor shell

### 19.3 — Catalog mutations

Vendor catalog create/lifecycle/variants/offers over **existing** Catalog HTTP APIs
(`authedRequest` session auth). Routes: `/vendor/[vendorId]/catalog` +
`/vendor/[vendorId]/catalog/[productId]`.

- [x] Create product (`POST /products`) + category multi-select from `GET /categories`
- [x] Product list rows link to detail (`GET /products/:productId`)
- [x] Lifecycle: submit-review / publish / unpublish / archive
- [x] Create variant (`POST /products/:productId/variants`) + activate/archive by id
- [x] Store offer create (`POST /store-offers`) for selected store
- [x] Offer activate / suspend / price update (`PATCH …/price`)
- [x] Media attach UI (primary image + gallery via `PATCH /products`)

### 19.6 — Catalog editor UX (Martvill-style simple flow)

Draft-first vendor product creation with a single-page sectioned editor (General,
Pricing, Media, Inventory, Publish). Uses existing Catalog, Media, and Inventory
HTTP APIs — no new backend endpoints.

- [x] List page: **Add product** creates draft (`Untitled product` + `draft-*` SKU) and opens editor
- [x] Sectioned editor at `/vendor/[vendorId]/catalog/[productId]` with per-section Save
- [x] General: name, description, categories (`PATCH /products`)
- [x] Pricing: default variant + store offer for selected store
- [x] Media: multi-image gallery, primary selection, reorder (`PATCH /products` `media[]`)
- [x] Inventory: ensure item + receive stock for default variant
- [x] Publish: readiness checklist + lifecycle actions

Deferred: variable products, brands, duplicate/import/export, vendor-managed categories.

### 19.4 — Orders depth

Vendor order ops UI over **existing** Order / Fulfillment / Returns APIs (session
auth via `authedRequest`). No new backend endpoints. Routes:
`/vendor/[vendorId]/orders` + `/vendor/[vendorId]/orders/[orderId]`.

- [x] Client status filter chips on store orders list (`order.status`)
- [x] Start-processing / complete / cancel on order detail
- [x] Per-line fulfill (`POST …/lines/:lineId/fulfill` with qty)
- [x] Create shipment form (`POST /fulfillment/shipments`) + last-shipment
      sync-status / mark-delivered (no shipment list API)
- [x] Returns list + create (`GET`/`POST /orders/:orderId/returns`, reasons from
      `GET /returns/reasons`); cancel return (`POST /returns/:returnId/cancel`)
- [x] Admin approve/reject routes stay out of vendor UI

### 19.5 — Finance

Vendor finance depth over **existing** ledger/payout APIs (session auth). Route:
`/vendor/[vendorId]/finance`. No platform approve/reject/process or adjustments UI.

- [x] Payout request (`POST …/payouts` + Idempotency-Key; store from session switcher)
- [x] Statements (`GET …/statement` with optional from/to + pagination)
- [x] Commission totals from `summary.totalsByType` (COMMISSION keys)

### Dashboard

- [x] Finance summary cards (19.1)
- [ ] Sales
- [ ] Orders rollup
- [ ] Revenue charts
- [ ] Customers
- [ ] Inventory
- [x] Payouts (request UI) — manage stays platform

### Catalog

- [x] Products list (19.1 read)
- [x] Variants
- [x] Categories
- [ ] Media
- [x] Pricing

### Inventory

- [x] Stock
- [x] Adjustments
- [x] Transfers
- [ ] Low-stock alerts

### Orders

- [x] Store-scoped list + detail stubs (19.1)
- [x] Pending filters
- [x] Processing workflows
- [x] Fulfillment line UI
- [x] Shipping
- [x] Returns

### Finance

- [x] Ledger read (19.1)
- [x] Payouts list (19.1)
- [x] Commission
- [x] Statements
- [x] Payout request UI

### Multi-Store

- [x] Store switcher (19.1)
- [ ] Store permissions UX
- [ ] Store-specific catalog
- [x] Store inventory
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
- Effective storefront config (Phase 20.3.1 skeleton):
  `GET /api/v1/storefront/config` resolving Platform→Vendor→Store via Settings
  (CMS page builder still deferred)

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

- [x] Admin UI + thin admin APIs for vendor lifecycle (approve/suspend) over existing handlers
- [x] Store lifecycle admin surfaces
- [x] Admin Store Management Phase A — paginated list/stats, overview+health, admin lifecycle/provisioning routes, create via reused wizard, details shell (Overview / Provisioning / Settings / Staff / Activity placeholder)
- [ ] Optional verification document fields (when domain supports them)
- [x] Vendor/store staff management from admin shell
- [ ] Admin Store Management Phase B — tab integrations (catalog ✓, inventory ✓, orders ✓, POS receipt ✓; payments/shipping/tax/branding/SEO/notifications/analytics/GEM/activity full still open)

---

## Phase 20.3 — Website Control Center

Settings-backed branding/general is ready; **CMS page builder** stays deferred
(no CMS module). Do not start page-builder / draft→publish work until Media + CMS exist.

### 20.3.1 — Storefront config + branding (skeleton)

- [x] Public `GET /api/v1/storefront/config` (effective general + branding + public marketing)
- [x] Admin Website UI for platform general + branding (`/admin/system/website`)
- [x] Platform→Vendor→Store resolution reused from Settings `resolveEffective`
- [ ] CMS pages / nav / footer management
- [ ] Draft → publish + versioning
- [x] Redis cache for effective config only; DB remains truth
- [ ] Full Website Control Center (theme/nav/footer SEO beyond Settings fields)

---

## Phase 20.4 — Commerce config surfaces

Ship admin UIs **only after** owning domain modules exist:

- [x] Payment / COD admin surfaces — vendor + store COD settings on admin detail pages via existing `PATCH /vendors/:id/settings` and `PATCH /stores/:id/settings` (hub: `/admin/system/commerce`). Payment **provider** admin UI still deferred.
- [ ] Shipping / courier account admin surfaces (Fulfillment) — no public courier admin API (`CourierAccountStore` is internal); engines later
- [ ] Tax / commission admin surfaces (dedicated engines or later phases)

---

## Phase 20.5 — POS admin

- [ ] Registers / printers / barcode after POS domain expands beyond receipts
- [ ] Receipt template management remains store-scoped (already started)

---

## Phase 20.6 — Operations lists

- [x] Orders / payments / inventory / users admin lists via existing modules
      (`GET /admin/orders`, `/admin/payments`, `/admin/users`; inventory via
      `GET /inventory/stores/:storeId/items` + store picker)
- [x] No duplicate business rules in the admin BFF (thin list UIs over module handlers)

---

## Phase 20.7 — Security dashboard

- [x] Login history — `auth.login.*` via existing `GET /admin/audit/events?actionPrefix=`
- [x] Security events — identity writes `auth.*` through `AUDIT_PORT`; admin UI at
      `/admin/system/security` (Phase 22 sensitive-op catalog wired)

---

## Phase 20.8 — Reports entry

- [x] Operational counts from existing APIs where safe (dashboard widget over vendor/store
      lists + recent order/payment/user windows; not total aggregates)
- [x] Analytical widgets deferred to Phase 21 read models

---

# Phase 21 — Reporting & Analytics

## Objective

Build read-optimized **first-party** reporting (orders, revenue, AOV, store/vendor/product).  
Third-party tag delivery (GTM/GA4/Meta) is Phase **18.6** — never use GA4 as the ledger.

### 21.1 — Order facts read model (foundation)

- [x] `reporting_order_facts` projection table + migration
- [x] Outbox projection on `OrderCreated` / `OrderPaid` via `REPORTING_OUTBOX_HANDLER`
- [x] `GET /admin/reports/orders/summary` (platform admin; currency buckets)
- [x] Admin dashboard widget over the read model (not transactional list APIs)

### 21.2 — Vendor / store performance

- [x] `GET /admin/reports/vendors/summary` and `/admin/reports/stores/summary` from facts
- [x] Admin `/admin/system/reports` (vendor + store tables; IDs only — no cross-module name join)

### Reports

- [x] Orders (summary counts + paid revenue from facts; detail reports later)
- [ ] Sales
- [ ] Revenue (beyond paid-order totals in 21.1)
- [x] Commission (paid totals + per vendor/store in 21.2; product-level later)
- [x] Vendor performance
- [x] Store performance
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
Admin Analytics (funnel, acquisition from order attribution)
```

Marketing tag sinks + consent: [docs/module/marketing.md](./module/marketing.md). Acquisition/campaign widgets may join order attribution snapshots; **ROAS only with ad-spend import**.

---

# Phase 22 — Audit & Compliance

## Objective

Make sensitive business operations traceable.

### Audit Events

- [x] Login (`auth.login.succeeded` / `auth.login.failed`)
- [x] Logout (`auth.logout`)
- [x] Failed login (`auth.login.failed`)
- [x] Password change (`auth.password.changed` / `auth.password.reset`)
- [x] Vendor approval (`vendor.approved` / `vendor.rejected` / `vendor.activated`)
- [x] Vendor suspension (`vendor.suspended`)
- [x] Product changes (`catalog.product.updated`)
- [x] Inventory adjustments (`inventory.adjusted`)
- [x] Order cancellation (`order.cancelled`)
- [x] Refund (`payment.refund.succeeded`)
- [x] Payout (`payout.approved` / `payout.rejected` / `payout.completed` / `payout.failed`)
- [x] Permission changes (`permission.vendor_staff_added` / `permission.vendor_staff_removed`)
- [x] Admin actions (`settings.upserted` / `media.registered`; secrets redacted in audit sink)
- [x] Token reuse (`auth.token.reuse_detected`)

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

- [x] Pino (`nestjs-pino` / `LoggerModule` in `app.module.ts`)
- [x] JSON logs (production; pretty in non-prod)
- [x] Request ID (`x-request-id` + ALS; shared with pino `req.id`)
- [x] Trace ID (`x-trace-id` correlation header; equals requestId until OpenTelemetry)
- [x] Actor ID (from ALS principal on access logs)
- [x] Vendor ID (from ALS scope)
- [x] Store ID (from ALS scope)
- [x] Operation (`METHOD` + route path on access logs)
- [x] Duration (`durationMs` via pino-http `responseTime`)
- [x] Error code (domain `code` on RFC7807 + structured failure logs)

### Logging notes

- Slice **23.1** enriches existing Pino HTTP logs; OpenTelemetry (**23.2–23.10**) and Sentry (**23.11**) are opt-in.

### OpenTelemetry

- [x] HTTP traces (opt-in `OTEL_ENABLED`; HTTP/Express/Nest; OTLP or console exporter)
- [x] PostgreSQL traces (`@opentelemetry/instrumentation-pg` on MikroORM’s `pg` driver)
- [x] Redis traces (`@opentelemetry/instrumentation-ioredis`; AUTH/HELLO redacted)
- [x] BullMQ traces (official `bullmq-otel` on Queue/Worker when `OTEL_ENABLED`)
- [x] Payment provider traces (`withExternalSpan` on refund gateway + payout disburse stubs)
- [x] Search traces (`withExternalSpan` on Meilisearch ensure/upsert/delete/search)

### OpenTelemetry notes

- Slice **23.2–23.10** — set `OTEL_ENABLED=true` and optionally `OTEL_EXPORTER_OTLP_ENDPOINT`.
  Without an endpoint, non-prod uses console spans/metrics; production requires an endpoint.
- Active OTel `traceId` is preferred for `x-trace-id` / ALS when a span is present.
- PG instrumentation keeps `enhancedDatabaseReporting: false` (no bound parameter values in spans).
- Redis `db.statement` redacts AUTH/HELLO and truncates long args.
- BullMQ uses `getBullmqTelemetry()` (no-op when OTEL is off).
- Payment/payout provider spans use safe ids only (no secrets, no full payloads).
- Search spans omit free-text query strings (use `has_query`, page/limit, ids only).

### Metrics

- [x] Request latency (`octopus.http.server.duration` via `HttpMetricsInterceptor`)
- [x] Error rate (`octopus.http.server.requests` by `http.status_class`)
- [x] DB latency (`db.client.operation.duration` from `@opentelemetry/instrumentation-pg`)
- [x] Redis latency (`octopus.redis.command.duration` on `REDIS_CLIENT`)
- [x] Queue depth (`octopus.queue.depth` from outbox BullMQ queues)
- [x] Queue lag (`octopus.queue.lag` = age of oldest waiting job)
- [x] Checkout success (`octopus.checkout.outcomes` outcome=success|failure)
- [x] Payment failures (`octopus.payment.failures`; refund provider rejects today)
- [x] Inventory conflicts (`octopus.inventory.conflicts` on insufficient stock)
- [x] Search indexing lag (`octopus.search.indexing.lag` enqueue→complete)
- [x] Payout failures (`octopus.payout.failures` on disbursement fail)

### Metrics notes

- Slice **23.8** — same `OTEL_ENABLED` / `OTEL_EXPORTER_OTLP_ENDPOINT` as traces; metrics export to `/v1/metrics` (or console in non-prod without an endpoint).
- Error rate = share of requests with `http.status_class=5xx` (and 4xx if desired) over `octopus.http.server.requests`.
- Slice **23.9** — PG pool/query duration is automatic once the MeterProvider is registered; Redis timings wrap the app Redis client; queue gauges register from `OutboxDispatcherService`.
- Slice **23.10** — business counters/histograms in `business-metrics.ts`; live payment gateways should call `recordPaymentFailure` on capture/callback failure.

### Sentry

- [x] Backend errors (`@sentry/nestjs`; 5xx via RFC7807 filter + Nest instrumentation)
- [x] Frontend errors (`@sentry/nextjs`; `instrumentation` + `global-error`)
- [x] Release tracking (`SENTRY_RELEASE` on backend/frontend init)
- [x] Sensitive data filtering (`scrubSentryEvent` / `sendDefaultPii: false`)

### Sentry notes

- Slice **23.11** — set `SENTRY_DSN` (API) and/or `NEXT_PUBLIC_SENTRY_DSN` (Next). Unset = disabled.
- Optional `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`. Source map upload needs `SENTRY_AUTH_TOKEN` in CI.

---

# Phase 24 — Performance & Scalability

## Objective

Optimize based on real measurements.

### Database

- [x] Query analysis (runbook + non-prod MikroORM SQL debug; OTel DB duration for prod)
- [x] Index review (baseline: FK/hot-path indexes from domain migrations; new indexes need EXPLAIN)
- [x] N+1 elimination (order list line batch; cart offer batch; search `loadOfferSources`)
- [x] Connection pool tuning (`DATABASE_POOL_MIN` / `DATABASE_POOL_MAX`)
- [x] Pagination (shared `clampLimit` / `clampOffset`; list endpoints bounded)
- [x] Lock analysis (inventory/payout/promotion/POS use `PESSIMISTIC_WRITE`; see performance.md)

### Redis

- [x] Cache strategy (allowlist: storefront effective config; never money/inventory/cart)
- [x] Cache invalidation (generation bump on settings upsert)
- [x] TTL policy (documented for login-rate, refresh, password-reset, outbox dedupe, storefront config)
- [x] Rate limiting (login: Redis `identity:login-rate:*`, 20 / 15m)
- [x] Queue optimization (shared job defaults, timeout, age+count retention, concurrency envs)

### API

- [x] Response compression (`compression()` middleware)
- [x] Pagination (same shared clamps as DB list reads)
- [x] Request limits (`HTTP_BODY_LIMIT`, default `1mb`)
- [x] Query limits (list `limit` capped at 200)
- [x] Slow query detection (`DATABASE_SLOW_QUERY_MS` + `SlowQueryLogger`)

### Next.js

- [x] Server Components (storefront catalog/search/PDP are RSC; interactive shells stay client islands)
- [x] Streaming (`(storefront)/loading.tsx` + existing Suspense on search/category)
- [x] Image optimization (`images.formats` avif/webp + MinIO/`NEXT_PUBLIC_MEDIA_BASE_URL` remotePatterns)
- [x] Route caching (`revalidate = 60` on home/categories/category/product)
- [x] Client bundle analysis (`@next/bundle-analyzer`; `ANALYZE=true npm run analyze -w frontend`)

### Notes

- Slice **24.1** — pool/body env knobs, gzip, shared pagination clamps, [performance.md](./engineering/performance.md).
- Slice **24.2** — slow-query logger, lock inventory, Redis TTL + login rate-limit docs.
- Slice **24.3** — Next.js RSC/streaming/images/revalidate/bundle analyzer.
- Slice **24.4** — N+1: order `hydrateMany` `$in` lines; cart `findManyByStoreAndVariant`; search `loadOfferSources` for reindex batches. Inventory/checkout per-line lookups remain for a later pass.
- Slice **24.5** — Redis storefront config cache (`settings:storefront-config:*`, 60s TTL + gen invalidation on upsert); `identity:user-families:*` TTL aligned to refresh family.
- Slice **24.6** — BullMQ shared job options (age/count retention), DLQ cap, worker lockDuration + `BULLMQ_CONCURRENCY_*` / `BULLMQ_JOB_TIMEOUT_MS` envs.
- Do not add speculative indexes or caches without a measured bottleneck.

### Rule

Never optimize by weakening correctness.

---

# Phase 25 — Security Hardening

## Objective

Perform a dedicated security pass.

### Application Security

- [x] Helmet (`configureApplication`; CSP off outside production)
- [x] CORS (`CORS_ORIGINS` allowlist + credentials; methods/headers allowlisted)
- [x] CSRF strategy (Bearer access + SameSite=lax path-scoped refresh cookie; see security.md)
- [x] Rate limiting (auth Redis + API limiter on checkout submit / product search)
- [x] Input validation (global ValidationPipe whitelist + forbidNonWhitelisted)
- [x] Output encoding (JSON API + React escaping; JSON-LD escapes `<`)
- [x] SSRF protection (courier outbound host allowlist + https; `OUTBOUND_URL_ALLOWLIST`)
- [x] File upload security (metadata allowlist + size/key + magic-byte prefix check)

### Authentication

- [x] Token rotation (refresh rotates; reuse revokes family)
- [x] Session revocation (logout / password change / reset revoke)
- [x] Password policy (`PasswordPolicy` on register/change/reset)
- [x] MFA (opt-in TOTP; platform.* APIs require MFA when caller is PLATFORM_ADMIN)
- [x] Brute-force protection (login Redis rate limit + account lockout)

### Authorization

- [x] RBAC (roles → permissions via `AuthorizationService` / `PermissionsGuard`)
- [x] Permission checks (`@RequirePermissions` + module authz services)
- [x] Ownership checks (vendor/store scoped handlers)
- [x] Tenant isolation (tenant context + module guards)
- [x] RLS (PostgreSQL session vars + `withRlsContext`)

### Payments

- [x] Webhook signature verification (shared `verifyHmacSha256Hex`; wire when online gateways land)
- [x] Replay protection (shared `assertWebhookTimestampFresh`; wire with gateways)
- [x] Idempotency (payment/checkout/refund operations)
- [x] Amount verification (integer minor units; domain invariants)
- [x] Currency verification (currency on intents/orders)

### Secrets

- [x] Secret manager (platform SM → env injection; no in-app Vault client — see security.md)
- [x] Key rotation (`JWT_SECRET_PREVIOUS` overlap for access tokens)
- [x] No secrets in Git (`.env` gitignored; `.env.example` placeholders)
- [x] No secrets in logs (Pino redact + audit/Sentry scrub)

### Notes

- Slice **25.1** — checkbox sync for already-shipped controls; tighten CORS headers/methods; document CSRF; rate-limit register/forgot; media content-type/size/key allowlist; [security.md](./engineering/security.md).
- Slice **25.2** — global `PermissionsGuard` + `@RequirePermissions` on admin HTTP; new `platform.*` read/reindex permissions; reject `CORS_ORIGINS=*`.
- Slice **25.3** — SSRF outbound allowlist on courier clients; JWT previous-secret rotation; webhook HMAC/timestamp helpers; output encoding (JSON-LD); secrets/rotation docs.
- Slice **25.4** — opt-in TOTP MFA (`/auth/mfa/*`); login returns `mfaRequired` when enabled; storefront MFA step.
- Slice **25.5** — media magic-byte prefix on register; Redis `API_RATE_LIMITER` on checkout/search; platform admin MFA gate on `platform.*` permissions. **Still open:** wire webhook helpers to live gateways; S3 Head/Get magic verify after upload.
- [x] commit push

---

# Phase 26 — Automated Testing

## Objective

Reach production-grade test coverage.

### Domain

- [x] Aggregates (identity, cart, order, payment, inventory, catalog, vendor/store, returns, POS, …)
- [x] Value objects (`Money`, `UniqueID`, email, password policy)
- [x] Policies (tenancy scope, settings authz, returnable qty, refundability)
- [x] State machines (order, payment intent, refund, shipment, return, shift)
- [x] Pricing (`pricing-engine`, promotion aggregate)
- [x] Commission (pricing quote + proportional clawback + ledger posting)
- [x] Inventory (item aggregate + concurrent reservation)

### Application

- [x] Authorization (`AuthorizationService`, settings authz)
- [x] Transactions (checkout/payment/inventory handlers with mocked UoW boundaries)
- [x] Idempotency (checkout submit, payment/refund, ledger keys)
- [x] Outbox (`outbox-dispatcher`, domain-event routing)
- [x] Error handling (RFC7807 filter + module exception filters)

### Integration

- [x] PostgreSQL (`tenant-isolation.rls.integration.spec` exercises real SQL when DB is up)
- [x] RLS (same integration spec)
- [x] Redis (`identity/.../redis.integration.spec` — login + API rate limiters when `REDIS_URL` is set; CI services Redis)
- [x] BullMQ (default job options + search indexing processor)
- [x] MikroORM (`user.orm.integration.spec` — EntityManager persist/load when `DATABASE_URL` is set)
- [ ] Payment adapters (live gateway adapters later; COD/stub covered in handlers)

### API

- [x] Authentication (Supertest probe: missing bearer → 401; valid token → principal)
- [x] Authorization (Supertest probe: customer → 403; platform MFA gate; admin + MFA → 200)
- [x] Validation (DTO whitelist via unit + ValidationPipe in configure)
- [x] Pagination (`clampLimit` / `clampOffset`)
- [x] Error contracts (RFC7807 filter specs + problem+json on 401)

### E2E

- [x] Registration (page smoke)
- [x] Login (page smoke)
- [x] Browse (home + categories smoke)
- [x] Search (page smoke)
- [x] Cart (page smoke)
- [ ] Multi-vendor checkout
- [ ] Payment
- [ ] Order tracking
- [ ] Vendor fulfillment
- [ ] Refund
- [ ] Payout

### Notes

- Slice **26.1** — checkbox sync against existing Vitest inventory (~98 specs); refresh Playwright smokes for current storefront; coverage map in [testing.md](./engineering/testing.md).
- Slice **26.2** — Nest+Supertest API contracts (`backend/src/test/api/`) for JWT auth, permissions, MFA gate; helper uses `APP_GUARD` factories (Vitest lacks decorator metadata).
- Slice **26.3** — Redis integration specs for login/API rate limiters (`describe.runIf(REDIS_URL)`).
- Slice **26.4** — MikroORM `UserOrmEntity` persist/load IT (`describe.runIf(DATABASE_URL)`); explicit property types for Vitest/esbuild. **Still open:** authenticated E2E revenue journeys; live payment adapter IT; SWC decorator metadata for ValidationPipe HTTP asserts.
- [x] commit push

---

# Phase 27 — CI/CD

## Objective

Prevent defective code from reaching production.

### Pull Request

Canonical gate: `.github/workflows/ci.yml` → `npm run validate` (Postgres + Redis services) + Playwright e2e job.

- [x] format
- [x] lint
- [x] typecheck
- [x] architecture checks
- [x] unit tests
- [x] integration tests (RLS + Redis when env URLs present)
- [x] security audit (`npm run security` inside validate)
- [x] migration validation (against CI Postgres)
- [x] build
- [x] Playwright e2e (separate job after validate)

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

Ops follow-up (image pipeline / CD not in this repo yet): see [deployment.md](./architecture/deployment.md).

### Deployment Strategies

Policy documented in [deployment.md](./architecture/deployment.md); orchestrator automation is Phase 28 / ops.

- [x] Rolling deployment (default for API + workers)
- [x] Blue/green where appropriate (optional storefront / edge cutover)
- [x] Canary where appropriate (deferred until SLOs justify it)
- [x] Automatic rollback (previous image on failed readiness/smoke; no down-migrate)
- [x] Forward recovery (expand/contract; prefer fix-forward)

### Notes

- Slice **27.1** — PR quality gate synced to existing `ci.yml` (validate + e2e).
- Slice **27.2** — deployment strategy policy in `docs/architecture/deployment.md` + OPERATIONS pointer. **Still open:** image build/push CD, registry scan, environment deploy (Phase 28 IaC / ops).
- [x] commit push

---

# Phase 28 — Infrastructure as Code

## Objective

Make production infrastructure reproducible.

### Infrastructure

Policy and env map: [infrastructure.md](./architecture/infrastructure.md). Aligns with Hostinger + Cloudflare in [current-baseline.md](./product/current-baseline.md).

**Development (Docker Compose)**

- [x] PostgreSQL
- [x] Redis
- [x] Object storage (MinIO)
- [x] Application runtime (`backend` compose profile + `backend/Dockerfile`)
- [x] Search (Meilisearch — compose; not listed in original Phase 28 bullets but required locally)

**Production (Hostinger + Cloudflare — provisioned in ops, not Terraformed yet)**

- [x] DNS / TLS (Cloudflare edge policy)
- [x] Load balancer (Cloudflare proxy as edge; origin reverse proxy on host)
- [ ] VPC/network (single-VPS model; no AWS VPC — document host firewall in ops when hardened)
- [ ] PostgreSQL (prod instance)
- [ ] Redis (prod instance)
- [ ] Object storage (prod S3-compatible)
- [ ] Application runtime (prod deploy of API image + Next)
- [ ] Secrets (host/env secret manager wired in prod)
- [ ] Monitoring (host + uptime; app OTel already exists)
- [ ] Backups (Phase 29)

### IaC

Chosen:

- **Docker Compose** — local/CI dependency stack (`docker-compose.yml`)
- **Terraform** — preferred later if automating Cloudflare/DNS or managed cloud resources (not Pulumi)
- No in-repo Terraform modules until a concrete cloud provider + credentials path exists

### Environments

```text
development
staging
production
```

Never share production secrets with development.

### Notes

- Slice **28.1** — IaC choice + environment/service map in `docs/architecture/infrastructure.md`. **Still open:** production host provisioning, secrets wiring, monitoring/backups ops (Phases 28 remainder / 29).
- [x] commit push

---

# Phase 29 — Backup & Disaster Recovery

## Objective

Prove the system can recover.

Policy: [backup-disaster-recovery.md](./architecture/backup-disaster-recovery.md).

### Database

- [x] Automated backups (ops contract: daily minimum; WAL/PITR when available — enable on prod host)
- [x] Point-in-time recovery (target when WAL/PITR available; else restore latest daily)
- [x] Backup encryption (required at rest + in transit)
- [x] Retention policy (30 days daily + 12 months monthly)
- [x] Restore testing (`npm.cmd run restore:drill` — local compose dump→restore proof)

### Redis

- [x] Reconstructable vs not documented (sessions/rate limits/cache ephemeral; Postgres remains truth)

Redis must not contain the only copy of financial/business truth.

### Object Storage

- [x] Versioning (enable on prod bucket when supported)
- [x] Lifecycle policy (90d non-current; 7d incomplete uploads)
- [x] Backup strategy (provider durability + versioning; optional second copy)

### Recovery

- [x] RTO defined (Postgres ≤ 4h; app ≤ 30m; search ≤ 4h reindex)
- [x] RPO defined (Postgres ≤ 24h baseline / ≤ 1h with PITR)
- [x] Disaster recovery runbook (outline in backup-disaster-recovery.md)
- [x] Restore drill (local script executed; prod quarterly drill remains ops cadence)

### Notes

- Slice **29.1** — RTO/RPO, Redis reconstructability, object-storage, and DR runbook policy.
- Slice **29.2** — `scripts/restore-drill.mjs` + `npm.cmd run restore:drill`; Postgres 18 compose volume mount fixed (`/var/lib/postgresql`). **Still open:** enable automated prod backups; quarterly prod restore drill on host.
- [x] commit push

---

# Phase 30 — Production Readiness Review

Evidence sync against shipped Phases 00–29. Open items stay unchecked.

### Architecture

- [x] No forbidden cross-module imports (`npm.cmd run architecture`)
- [x] Domain has no infrastructure dependencies (architecture gate)
- [x] Application layer has no ORM dependencies (architecture gate)
- [x] Infrastructure implements ports
- [x] Modules own their data
- [x] Cross-module communication is explicit (ports / shared-kernel)

### Security

- [x] RLS tested (`tenant-isolation.rls.integration`)
- [x] RBAC tested (`AuthorizationService` specs)
- [x] Permissions tested (Supertest + `PermissionsGuard` / MFA gate)
- [x] Secrets protected (env validation, Pino/Sentry/audit scrub)
- [x] Webhooks secured (HMAC + timestamp helpers; live gateway wiring still open)
- [x] Rate limiting enabled (login Redis + API limiter on checkout/search)
- [x] CORS restricted (explicit `CORS_ORIGINS`; `*` rejected)

### Financial

- [x] Money uses integer minor units (`Money` VO)
- [x] Payment callbacks idempotent (payment operations / handlers)
- [x] Refunds idempotent
- [x] Commission deterministic
- [x] Payout ledger immutable (append-only)
- [x] Financial history auditable (ledger + audit events)

### Inventory

- [x] Reservation transactional
- [x] Overselling prevented
- [x] Concurrency tested (`concurrent-reservation.spec`)
- [x] Reservation expiration implemented (`expireDue` / `ReservationExpired`)

### Reliability

- [x] Outbox enabled
- [x] Queue retry policy (`bullmq-default-job-options`)
- [x] Dead-letter handling (`octopus.dead-letter`)
- [x] Idempotent consumers (Redis NX by outbox id)
- [x] Graceful shutdown (`registerGracefulShutdown`)
- [x] Health checks (live / ready)

### Observability

- [x] Logs (Pino)
- [x] Metrics (OTel / app meters)
- [x] Traces (OTel)
- [x] Error monitoring (Sentry scrubbed)
- [ ] Alerts (pager / burn-rate rules not provisioned)
- [x] Dashboards (admin reporting / system health UI; dedicated ops metric boards later)

### Testing

- [x] Unit
- [x] Integration (RLS + Redis when env URLs set)
- [x] API (Supertest auth contracts)
- [x] E2E (Playwright smoke; authenticated revenue journeys still open)
- [x] Security (authz/MFA/rate-limit/SSRF specs)
- [x] Concurrency
- [x] Migration (`migration:check`; clean-DB RLS helper order fixed in `Migration20250822210000`)

### Operations

- [x] Backups (policy Phase 29)
- [x] Restore tested (local `restore:drill`)
- [ ] Deployment tested (no prod deploy drill yet)
- [ ] Rollback tested (policy only — Phase 27.2)
- [x] Incident runbooks (OPERATIONS + DR outline)
- [ ] Monitoring alerts (not provisioned)

### Notes

- Slice **30.1** — production-readiness checkbox sync + fix `Migration20250822210000` so `app.*` RLS helpers exist before policies (clean migrate). **Still open:** ops alerts; prod deploy/rollback drills; live payment webhooks; authenticated E2E revenue paths; Phase 26 MikroORM container / live payment adapter IT.
- [x] commit push

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

- [x] commit push

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
