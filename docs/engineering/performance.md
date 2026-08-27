# Performance

Phase 24 rule: optimize from measurements, never by weakening correctness.

## Baseline (slice 24.1–24.2)

| Control      | Default                                       | Notes                                                                           |
| ------------ | --------------------------------------------- | ------------------------------------------------------------------------------- |
| DB pool      | `DATABASE_POOL_MIN=1`, `DATABASE_POOL_MAX=10` | Raise `MAX` only after pool wait / saturation signals                           |
| Slow queries | `DATABASE_SLOW_QUERY_MS=500`                  | MikroORM `SlowQueryLogger`; `0` disables                                        |
| HTTP body    | `HTTP_BODY_LIMIT=1mb`                         | Express JSON + urlencoded                                                       |
| Compression  | `compression()`                               | gzip/deflate for compressible responses                                         |
| List limits  | default 50, max 200                           | `clampLimit` / `clampOffset` in `shared-kernel/presentation/http/pagination.ts` |
| Login rate   | 20 failures / 15m per key                     | Redis `identity:login-rate:*` (login/register/forgot)                           |

## Indexes

Hot-path indexes already ship with domain migrations (vendor/store FKs, outbox unpublished, reservations, payments, ledger, notifications, reporting facts). Add new indexes only with `EXPLAIN (ANALYZE, BUFFERS)` evidence for a real slow query.

## Query analysis

- Non-prod MikroORM SQL debug remains on; production stays quiet except `[slow-query]` warnings.
- Prefer OTel `db.client.operation.duration` + app metrics over blind index thrash.
- For a suspect statement: `EXPLAIN (ANALYZE, BUFFERS)` in a staging clone with representative data.

## Locks

Pessimistic write locks (`LockMode.PESSIMISTIC_WRITE` / `FOR UPDATE`) are used for inventory mutations, payout processing, promotion usage, and POS receipt numbering via repository `withLockedUnitOfWork` / locked finds. Prefer those helpers over ad-hoc locking.

## Redis TTL policy

| Key prefix                         | TTL                          | Purpose                         |
| ---------------------------------- | ---------------------------- | ------------------------------- |
| `identity:login-rate:*`            | 15 minutes                   | Login brute-force window        |
| `identity:refresh:*` / families    | refresh token remaining life | Session refresh                 |
| `identity:user-families:*`         | refresh family remaining TTL | Index of families per user      |
| `identity:password-reset:*`        | reset token remaining life   | Password reset                  |
| `outbox:processed:*`               | 14 days                      | Worker idempotency              |
| `settings:storefront-config:gen`   | 30 days (sliding)            | Cache generation                |
| `settings:storefront-config:{g}:*` | 60 seconds                   | Effective public storefront cfg |

Do not introduce unbounded Redis keys. Prefer `SET … EX` / `EXPIRE` at write time.

## Redis cache strategy (slice 24.5)

**Allowlist:** effective public storefront config only (`GET /api/v1/storefront/config`). DB remains truth.

**Forbidden:** money, inventory, cart/checkout, payment, ledger, or any secret-bearing marketing fields (secrets are stripped before cache).

**Invalidation:** settings upsert bumps `settings:storefront-config:gen` so all scoped payload keys miss without SCAN. Fail-open if Redis is unavailable.

**Namespaces today:** `identity:*` (auth/rate), `outbox:*` (worker dedupe), BullMQ keys, `settings:storefront-config:*` (read-through config).

## Next.js (slice 24.3)

- Storefront browse/PDP routes are React Server Components; admin/vendor shells remain client for interactivity.
- `(storefront)/loading.tsx` streams a skeleton while RSC data loads; search/category already use `Suspense`.
- `next/image` allows local MinIO (`localhost:9000`) plus optional `NEXT_PUBLIC_MEDIA_BASE_URL`.
- Public catalog pages set `revalidate = 60`.
- Bundle report: `ANALYZE=true npm run analyze -w frontend` (opens the analyzer HTML after build).

## N+1 (slice 24.4)

| Path                                       | Before                           | After                                        |
| ------------------------------------------ | -------------------------------- | -------------------------------------------- |
| Order `listByCustomerId` / `listByStoreId` | One lines query per order        | Single `orderId IN (...)` + in-memory group  |
| Cart validate / recalculate offers         | One offer lookup per line        | `findManyByStoreAndVariant` (`$or` pairs)    |
| Search indexing batches                    | Offer + product + variant per id | `loadOfferSources` (3 queries for the batch) |

Still per-item (deferred): cart/checkout inventory availability, checkout warehouse pick/reserve, search stock lookups after source load.

## Queues (slice 24.6)

| Control                | Default                        | Notes                                                   |
| ---------------------- | ------------------------------ | ------------------------------------------------------- |
| Job attempts / backoff | 5 / exponential 2s             | Shared `BULLMQ_DEFAULT_JOB_OPTIONS`                     |
| Worker lock duration   | `BULLMQ_JOB_TIMEOUT_MS=30000`  | Hung jobs stall → retry (BullMQ 6 has no job `timeout`) |
| removeOnComplete       | age 1d + count 1000            | Age prevents idle Redis growth                          |
| removeOnFail           | age 7d + count 5000            | Same                                                    |
| DLQ retention          | age 7d + count 1000            | Was unbounded (`false`)                                 |
| Concurrency default    | `BULLMQ_CONCURRENCY_DEFAULT=5` | domain-events, payment, notification, marketing         |
| Concurrency payout     | `BULLMQ_CONCURRENCY_PAYOUT=3`  | Ledger/payout path                                      |
| Concurrency search     | `BULLMQ_CONCURRENCY_SEARCH=3`  | Protect Meilisearch                                     |
| Outbox poll            | `OUTBOX_POLL_INTERVAL_MS=2000` | Existing                                                |
| Outbox batch           | `OUTBOX_BATCH_SIZE=50`         | **Per outbox table** (up to ~7× per poll)               |

Do not raise concurrency without watching `octopus.queue.depth` / lag and downstream SLAs.

## Related

- [observability.md](./observability.md)
- [production-readiness.md](./production-readiness.md)
