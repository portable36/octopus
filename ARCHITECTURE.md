# Architecture Contract

## 1. Bounded contexts

Recommended bounded contexts:

| Context | Owns |
|---|---|
| Auth & Identity | users, credentials, sessions, roles, permissions |
| Vendor | vendors, vendor users, onboarding, vendor status |
| Store | stores, store configuration, operating state |
| Catalog | products, variants, attributes, categories, brands |
| Inventory | stock, reservations, adjustments, warehouses |
| Cart | carts, cart lines, pricing snapshot |
| Checkout | checkout orchestration, address snapshot, totals |
| Order | orders, order lines, state machine, fulfillment status |
| Payment | payment intents, transactions, callbacks, refunds |
| Payout | vendor balances, commissions, payout batches |
| Promotion | coupons, campaigns, discounts |
| Shipping | shipping methods, shipments, tracking |
| Notification | email/SMS/push/in-app notifications |
| Search | Meilisearch indexing and search read models |
| Reporting | read-only analytical projections |
| Audit | security and business audit trail |

A bounded context owns its data model and business invariants. Shared tables are prohibited unless ownership is explicitly documented.

## 2. Module structure

Each backend module should follow:

```text
module/
  domain/
    entities/
    value-objects/
    services/
    events/
    repositories/
    errors/
  application/
    commands/
    queries/
    dto/
    ports/
    services/
  infrastructure/
    persistence/
    messaging/
    integrations/
  presentation/
    http/
    consumers/
```

Dependency direction:

```text
presentation -> application -> domain
infrastructure -> application/domain ports
domain -> nothing external
```

## 3. Aggregate rules

- Aggregate roots enforce invariants.
- External code cannot mutate aggregate internals directly.
- Repositories load/save aggregate roots.
- Avoid giant aggregates.
- Cross-aggregate consistency is normally handled by application services, domain events, or sagas/process managers.
- Do not use database foreign keys as an excuse to violate bounded-context ownership.

## 4. Multi-tenancy

Every tenant-sensitive command must resolve:

```text
request -> authenticated principal -> tenant/vendor/store scope -> authorization policy -> use case -> repository
```

Never trust `tenantId`, `vendorId`, `storeId`, or ownership IDs supplied by the browser.

PostgreSQL RLS is defense in depth, not a replacement for application authorization.

## 5. Vendor/store hierarchy

Recommended conceptual hierarchy:

```text
Platform
  └── Vendor
       ├── Vendor Users
       ├── Stores
       │    ├── Products / Offers
       │    ├── Inventory
       │    └── Orders
       └── Financial Account
```

A product catalog can be vendor-owned while a store owns an offer/listing, price, availability, or inventory policy. Make ownership explicit instead of assuming every product is store-global.

## 6. Unified multi-vendor cart

A cart may contain lines from multiple stores/vendors, but checkout must create independent order boundaries where required by fulfillment, payment, taxation, commission, or payout rules.

Never model one vendor's order mutation as a mutation of another vendor's aggregate.

## 7. Money

Use integer minor units plus ISO currency:

```text
amountMinor: bigint/integer
currency: ISO 4217 code
```

Never use floating point for money.

Totals must be reproducible from immutable snapshots:

```text
subtotal
- discounts
+ shipping
+ tax
= grand total
```

Persist the pricing inputs needed to explain the final amount.

## 8. Inventory

Inventory correctness must be database-backed.

A safe reservation flow:

1. Start transaction.
2. Lock the relevant inventory row/version.
3. Verify available quantity.
4. Create reservation.
5. Decrement/reserve atomically.
6. Create outbox event.
7. Commit.
8. Publish asynchronously.

Redis locks can reduce contention but must never be the sole correctness mechanism.

## 9. Order state machine

Order transitions must be explicit and validated:

```text
PENDING_PAYMENT
  -> PAID
  -> PROCESSING
  -> PARTIALLY_FULFILLED
  -> FULFILLED
  -> COMPLETED

PENDING_PAYMENT -> PAYMENT_FAILED
PAID -> CANCELLED
PROCESSING -> CANCELLED (only when policy allows)
FULFILLED -> RETURN_REQUESTED
RETURN_REQUESTED -> RETURNED
```

Do not update status by assigning arbitrary strings.

## 10. Payments

Payment provider callbacks are untrusted external input.

Every callback must:

- verify authenticity/signature where supported
- validate schema
- identify provider transaction
- be idempotent
- map provider status to internal state
- prevent amount/currency/order mismatch
- record raw provider reference safely
- execute state changes transactionally
- emit an outbox event
- return an appropriate provider response

Never mark an order paid solely because a frontend redirected to a success page.

## 11. Payouts

Vendor balances should be ledger-oriented.

Prefer immutable entries:

```text
credit sale
debit platform commission
debit refund
debit adjustment
credit shipping reimbursement
debit payout
```

Current balance can be projected from the ledger. Do not make a mutable `balance` field the only source of truth.

## 12. Events

Use two categories:

- Domain events: describe business facts inside the modular monolith.
- Integration events: messages that cross asynchronous/process boundaries.

For durable delivery use the transactional outbox:

```text
business transaction
    + outbox insert
    -> commit
    -> dispatcher
    -> queue/event consumer
```

Consumers must be idempotent.

## 13. Search

Meilisearch is a read model, never the source of truth.

Database commit succeeds first. Search indexing follows asynchronously.

Products unavailable for sale must not remain accidentally searchable as purchasable inventory.

## 14. API

Use:

```text
/api/v1/<resource>
```

Rules:

- explicit request/response DTOs
- consistent error envelope
- pagination contract
- filtering/sorting allowlists
- idempotency keys for retryable mutations
- correlation/request IDs
- OpenAPI documentation
- no ORM entities exposed directly

## 15. Frontend

Server Components are the default in Next.js App Router.

Use Client Components only when interaction requires browser state, effects, or event handlers.

- TanStack Query: server state
- Zustand: small client/UI state
- URL search params: shareable filter/navigation state
- Server Actions only where the security and API boundary is intentionally designed
- Never expose secrets to the browser
