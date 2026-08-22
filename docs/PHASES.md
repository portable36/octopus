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

---

# Phase 00 — Foundation & Repository Setup

## Objective
Establish a deterministic, reproducible development environment and unified repository workspace structures.

### Backend
- [ ] NestJS application framework bootstrap.
- [ ] Enable absolute TypeScript strict mode compilation.
- [ ] Implement central typed AppConfig service.
- [ ] Enforce environment variables runtime validation using Joi/Zod.
- [ ] Integrate Pino structured fast JSON logging format.
- [ ] Configure AsyncLocalStorage context middleware for Correlation ID tracking.
- [ ] Set up global ValidationPipe with transformed error formatting.
- [ ] Create RFC 7807 compliant unified Global Exception Filter.
- [ ] Integrate Swagger/OpenAPI via @nestjs/swagger metadata plugins.
- [ ] Add Terminus database, Redis, and disk space health check routes.
- [ ] Wire process handlers for clean app graceful shutdown.
- [ ] Dockerize isolated backend development runtime configurations.

### Frontend
- [ ] Scaffold Next.js enterprise directory layout using App Router.
- [ ] Enable absolute strict TypeScript type checking targets.
- [ ] Initialize Tailwind CSS config with modular styling themes.
- [ ] Setup shadcn/ui framework and primitive base styles.
- [ ] Configure Radix primitive underlying accessible layout states.
- [ ] Build global TanStack Query configuration cache managers.
- [ ] Establish client Zustand store structure patterns.
- [ ] Build dynamic, type-safe Axios/Fetch API client wrapper.
- [ ] Implement localized Error Boundary fallback components.

### Infrastructure
- [ ] Deploy local PostgreSQL database container image configurations.
- [ ] Spin up localized Redis cache layer broker containers.
- [ ] Install local Meilisearch engines for development testing.
- [ ] Provision MinIO instances for localized S3-compatible asset management.
- [ ] Assemble orchestrated multi-container root Docker Compose assets.
- [ ] Document strict production-to-local environment configuration templates.

### Quality Gates
- [ ] `npm run lint` — Zero syntax structural code style errors.
- [ ] `npm run typecheck` — Total compilation error prevention checks.
- [ ] `npm run architecture` — Rule dependency-cruiser design isolation checks.
- [ ] `npm run test` — Executing initial unit assertions cleanly.
- [ ] `npm run build` — Successful native application deployment compilations.

---

# Phase 01 — Identity, Authentication & Authorization

## Objective
Build the complete system-wide secure identity boundary foundation prior to executing business core services.

### Identity
- [ ] Design pure User domain Aggregate Root boundaries.
- [ ] Implement secure time-ordered Unique ID value objects.
- [ ] Create strict regex Email value objects.
- [ ] Code custom complex Password policy structural requirements.
- [ ] Define comprehensive operational lifecycle User Status states.
- [ ] Map explicit methods tracking domain account history mutations.

### Authentication
- [ ] Write Registration use-case processing pipelines.
- [ ] Build standard secure login controller route structures.
- [ ] Code Session Logout token invalidation routines.
- [ ] Configure stateless short-lived Access JWT signatures.
- [ ] Set up secure state HTTP-only Refresh JWT cookies.
- [ ] Code custom dynamic Refresh Token Rotation validations.
- [ ] Build Redis-backed Refresh Token Revocation tracking.
- [ ] Wire active automated Token Family reuse fraud protection engines.
- [ ] Configure multi-pass Argon2id high-security cryptographic hashing strategies.
- [ ] Isolate domain model internal password verification methods.
- [ ] Code structural authenticated user Password Change utilities.
- [ ] Design dynamic temporary Forgot Password tracking flows.
- [ ] Construct validated transactional token Account Reset operations.

### Optional Authentication
- [ ] Build Google OAuth OpenID Connect registration endpoints.
- [ ] Integrate Facebook OAuth secure login credential parsers.
- [ ] Create dedicated local mobile carrier transactional OTP login layers.
- [ ] Implement email Verification activation tracking tokens.
- [ ] Configure optional Multi-Factor Authentication TOTP generator apps.

### Authorization
- [ ] Construct base security Access Role definitions.
- [ ] Map discrete contextual feature granular Permissions lists.
- [ ] Build static Role-Permission lookup mapping structures.
- [ ] Program unified application-wide dynamic Permission Guard interceptors.
- [ ] Build advanced declarative resource Access Policy compilation engines.
- [ ] Enforce automated runtime resource tenant Ownership validation criteria.

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
- [ ] Invalid credentials
- [ ] Expired access token
- [ ] Expired refresh token
- [ ] Refresh token reuse
- [ ] Revoked token
- [ ] Wrong role
- [ ] Missing permission
- [ ] Privilege escalation attempt
- [ ] Rate limiting
- [ ] Brute-force protection

### Exit Criteria

Authentication and authorization are usable by every future bounded context.

---

# Phase 02 — Multi-Tenancy & Security Isolation

## Objective

Establish hard tenant/vendor/store isolation before exposing business data.

### Tenant Context
- [ ] AsyncLocalStorage request context
- [ ] Authenticated principal
- [ ] Vendor context
- [ ] Store context
- [ ] Platform context
- [ ] Request ID

### PostgreSQL
- [ ] RLS foundation
- [ ] Tenant policies
- [ ] Vendor policies
- [ ] Store policies
- [ ] Transaction-local context
- [ ] RLS helper functions

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
- [ ] Vendor A cannot read Vendor B
- [ ] Vendor A cannot modify Vendor B
- [ ] Store A cannot access Store B
- [ ] Store manager cannot escape assigned store
- [ ] Customer cannot access vendor resources
- [ ] Platform admin explicit access
- [ ] RLS bypass attempts fail

### Exit Criteria

Cross-tenant data access is impossible through normal application paths.

---

# Phase 03 — Vendor Management

## Objective

Implement vendor onboarding and vendor lifecycle.

### Vendor Aggregate
- [ ] Vendor entity
- [ ] Vendor ID
- [ ] Vendor status
- [ ] Vendor profile
- [ ] Business information
- [ ] Contact information
- [ ] Vendor settings

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

### Features
- [ ] Vendor registration
- [ ] Vendor onboarding
- [ ] Admin approval
- [ ] Vendor rejection
- [ ] Vendor suspension
- [ ] Vendor activation
- [ ] Vendor staff
- [ ] Vendor roles
- [ ] Vendor permissions

### Events

```text
VendorCreated
VendorApproved
VendorSuspended
VendorActivated
```

### Tests
- [ ] Vendor ownership
- [ ] Admin authorization
- [ ] Staff permissions
- [ ] Lifecycle transitions

---

# Phase 04 — Store Management

## Objective

Allow each vendor to operate multiple stores.

### Store
- [ ] Store aggregate
- [ ] Store ID
- [ ] Vendor ownership
- [ ] Store slug
- [ ] Store status
- [ ] Store settings
- [ ] Store timezone
- [ ] Store currency
- [ ] Store address
- [ ] Store staff

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
- [ ] Create store
- [ ] Update store
- [ ] Activate store
- [ ] Suspend store
- [ ] Store staff assignment
- [ ] Store permissions

### Tests
- [ ] Vendor isolation
- [ ] Store ownership
- [ ] Staff access
- [ ] Store lifecycle

---

# Phase 05 — Catalog

## Objective

Build a scalable product/catalog domain.

### Product
- [ ] Product aggregate
- [ ] Product ID
- [ ] SKU
- [ ] Product name
- [ ] Description
- [ ] Brand
- [ ] Category
- [ ] Attributes
- [ ] Media
- [ ] Status

### Product Variants
- [ ] Variant
- [ ] Variant SKU
- [ ] Attributes
- [ ] Barcode
- [ ] Weight
- [ ] Dimensions

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

### Categories
- [ ] Category tree
- [ ] Parent/child categories
- [ ] Slugs
- [ ] SEO metadata

### Media
- [ ] S3/R2 integration
- [ ] Signed URLs
- [ ] Image metadata
- [ ] Upload validation
- [ ] Image ordering

### Tests
- [ ] Vendor ownership
- [ ] Store ownership
- [ ] SKU uniqueness
- [ ] Variant uniqueness
- [ ] Product lifecycle

---

# Phase 06 — Inventory

## Objective

Implement concurrency-safe inventory management.

### Inventory
- [ ] Inventory item
- [ ] Warehouse
- [ ] Stock quantity
- [ ] Reserved quantity
- [ ] Available quantity
- [ ] Low-stock threshold

### Operations
- [ ] Stock receive
- [ ] Stock adjustment
- [ ] Stock transfer
- [ ] Stock reservation
- [ ] Reservation release
- [ ] Reservation expiration
- [ ] Stock deduction

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

### Tests
- [ ] Concurrent reservation
- [ ] Overselling prevention
- [ ] Reservation expiry
- [ ] Wrong vendor
- [ ] Wrong store

---

# Phase 07 — Pricing & Promotion

## Objective

Create one authoritative pricing engine.

### Pricing
- [ ] Base price
- [ ] Sale price
- [ ] Currency
- [ ] Tax
- [ ] Shipping
- [ ] Discount
- [ ] Commission

### Promotions
- [ ] Coupons
- [ ] Percentage discount
- [ ] Fixed discount
- [ ] Minimum order amount
- [ ] Product-specific promotion
- [ ] Category promotion
- [ ] Vendor promotion
- [ ] Store promotion
- [ ] Usage limits
- [ ] Expiration

### Rule

The browser never determines the final price.

```text
Frontend price = display hint
Backend price  = authoritative
```

### Tests
- [ ] Discount calculation
- [ ] Coupon validation
- [ ] Expiration
- [ ] Usage limits
- [ ] Vendor restrictions
- [ ] Store restrictions
- [ ] Currency handling

---

# Phase 08 — Cart

## Objective

Support unified multi-vendor shopping carts.

### Cart
- [ ] Cart aggregate
- [ ] Cart item
- [ ] Quantity
- [ ] Store
- [ ] Vendor
- [ ] Product
- [ ] Variant
- [ ] Price snapshot

### Cart Operations
- [ ] Add item
- [ ] Remove item
- [ ] Update quantity
- [ ] Clear cart
- [ ] Validate cart
- [ ] Recalculate cart

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
- [ ] Quantity validation
- [ ] Product availability
- [ ] Price changes
- [ ] Inventory changes
- [ ] Multi-vendor cart
- [ ] Vendor isolation

---

# Phase 09 — Checkout

## Objective

Create an atomic and authoritative checkout pipeline.

### Checkout
- [ ] Address
- [ ] Shipping method
- [ ] Tax
- [ ] Discounts
- [ ] Shipping fee
- [ ] Commission
- [ ] Grand total

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
- [ ] Price change
- [ ] Stock change
- [ ] Coupon failure
- [ ] Duplicate request
- [ ] Concurrent checkout
- [ ] Multi-vendor checkout

---

# Phase 10 — Orders

## Objective

Build the central order domain.

### Order
- [ ] Order aggregate
- [ ] Order number
- [ ] Customer
- [ ] Vendor
- [ ] Store
- [ ] Order lines
- [ ] Price snapshots
- [ ] Tax snapshot
- [ ] Shipping snapshot
- [ ] Address snapshot
- [ ] Payment status
- [ ] Fulfillment status

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
- [ ] Valid transitions
- [ ] Invalid transitions
- [ ] Cancellation
- [ ] Partial fulfillment
- [ ] Refund
- [ ] Return

---

# Phase 11 — Payment

## Objective

Create provider-independent payment infrastructure.

### Provider Port

```text
PaymentProvider
  ├── createPayment()
  ├── verifyPayment()
  ├── refund()
  └── parseWebhook()
```

### Providers
- [ ] SSLCommerz
- [ ] bKash
- [ ] Nagad

### Payment
- [ ] Payment intent
- [ ] Payment transaction
- [ ] Provider reference
- [ ] Amount
- [ ] Currency
- [ ] Status
- [ ] Callback
- [ ] Refund

### Security
- [ ] Signature validation
- [ ] Replay protection
- [ ] Idempotency
- [ ] Amount verification
- [ ] Currency verification
- [ ] Order verification

### Critical Rule

Never:

```text
frontend success redirect → order PAID
```

Instead:

```text
provider callback
→ verify
→ transaction
→ mark payment
→ mark order
→ outbox
```

---

# Phase 12 — Transactional Outbox & BullMQ

## Objective

Make asynchronous processing durable.

### Outbox
- [ ] Outbox table
- [ ] Aggregate ID
- [ ] Event type
- [ ] Payload
- [ ] Event version
- [ ] Created timestamp
- [ ] Published timestamp
- [ ] Retry count

### Dispatcher

```text
DB transaction
    ↓
Outbox
    ↓
Dispatcher
    ↓
BullMQ
    ↓
Consumer
```

### Queues
- [ ] Email
- [ ] Notification
- [ ] Search indexing
- [ ] Payment processing
- [ ] Webhooks
- [ ] Payout
- [ ] Analytics

### Reliability
- [ ] Retry policy
- [ ] Exponential backoff
- [ ] Dead-letter handling
- [ ] Idempotent consumers
- [ ] Queue metrics

---

# Phase 13 — Shipping & Fulfillment

## Objective

Support vendor/store fulfillment.

### Shipment
- [ ] Shipment
- [ ] Shipment items
- [ ] Carrier
- [ ] Tracking number
- [ ] Shipping status

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

### Features
- [ ] Vendor fulfillment
- [ ] Partial fulfillment
- [ ] Shipment tracking
- [ ] Delivery confirmation
- [ ] Return shipment

---

# Phase 14 — Refunds & Returns

## Objective

Implement complete post-purchase lifecycle.

### Returns
- [ ] Return request
- [ ] Return reason
- [ ] Return items
- [ ] Approval
- [ ] Rejection
- [ ] Inspection
- [ ] Refund

### Refund Rules
- [ ] Maximum refundable amount
- [ ] Partial refund
- [ ] Full refund
- [ ] Payment-provider refund
- [ ] Inventory restoration
- [ ] Financial ledger entry

### Tests
- [ ] Duplicate refund
- [ ] Over-refund
- [ ] Invalid order state
- [ ] Partial return
- [ ] Vendor isolation

---

# Phase 15 — Vendor Financial Ledger & Payouts

## Objective

Build auditable vendor accounting.

### Ledger

```text
CREDIT  Sale
DEBIT   Commission
DEBIT   Refund
CREDIT  Adjustment
DEBIT   Payout
```

### Features
- [ ] Vendor ledger
- [ ] Commission calculation
- [ ] Available balance
- [ ] Pending balance
- [ ] Payout request
- [ ] Payout approval
- [ ] Payout processing
- [ ] Payout failure
- [ ] Payout history
- [ ] Financial statements

### Rules

Never rely solely on `vendor.balance`.

Use immutable ledger entries as the source of financial history.

---

# Phase 16 — Search

## Objective

Build an asynchronous search read model.

### Meilisearch
- [ ] Product index
- [ ] Category filters
- [ ] Brand filters
- [ ] Vendor filters
- [ ] Store filters
- [ ] Price filters
- [ ] Availability
- [ ] Facets
- [ ] Typo tolerance
- [ ] Ranking

### Index Pipeline

```text
Catalog mutation
→ Domain event
→ Outbox
→ BullMQ
→ Search consumer
→ Meilisearch
```

### Rule

Meilisearch is never the source of truth.

---

# Phase 17 — Notifications

## Objective

Create centralized notification infrastructure.

### Channels
- [ ] Email
- [ ] SMS
- [ ] Push
- [ ] In-app

### Events
- [ ] Account created
- [ ] Password changed
- [ ] Order placed
- [ ] Payment completed
- [ ] Payment failed
- [ ] Order shipped
- [ ] Order delivered
- [ ] Refund processed
- [ ] Vendor approved
- [ ] Payout completed

### Reliability
- [ ] Queue-based delivery
- [ ] Retry
- [ ] Idempotency
- [ ] Templates
- [ ] Preferences
- [ ] Delivery status

---

# Phase 18 — Customer Experience

## Objective

Complete customer-facing commerce functionality.

### Storefront
- [ ] Homepage
- [ ] Store pages
- [ ] Product listing
- [ ] Product detail
- [ ] Search
- [ ] Filtering
- [ ] Sorting
- [ ] Category navigation
- [ ] Cart
- [ ] Checkout
- [ ] Order tracking

### Customer Account
- [ ] Profile
- [ ] Addresses
- [ ] Orders
- [ ] Returns
- [ ] Refunds
- [ ] Wishlist
- [ ] Reviews
- [ ] Notifications

### SEO
- [ ] Metadata
- [ ] Canonical URLs
- [ ] Sitemap
- [ ] Robots
- [ ] Product structured data
- [ ] Category structured data
- [ ] SSR/streaming

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

Build platform-wide administration.

### Vendor Management
- [ ] Vendor onboarding
- [ ] Approval
- [ ] Suspension
- [ ] Verification
- [ ] Vendor staff

### Platform Configuration
- [ ] Commission rules
- [ ] Tax settings
- [ ] Payment providers
- [ ] Shipping configuration
- [ ] Global settings

### Operations
- [ ] Orders
- [ ] Payments
- [ ] Refunds
- [ ] Payouts
- [ ] Inventory
- [ ] Users

### Security
- [ ] Admin RBAC
- [ ] Audit logs
- [ ] Login history
- [ ] Security events

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
