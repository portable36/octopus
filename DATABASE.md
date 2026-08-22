# Database Rules

## PostgreSQL

Use PostgreSQL as the source of truth.

### IDs

Prefer UUID/UUIDv7 or another sortable application-approved identifier strategy. Never expose sequential internal IDs if they create an enumeration risk.

### Timestamps

Persist timestamps in UTC. Use explicit `created_at`, `updated_at`, and domain-specific timestamps such as `paid_at`.

### Soft deletion

Do not add soft delete to every table by default. Use it only where restoration/audit requirements justify it.

### Constraints

Business invariants that can safely be represented in PostgreSQL should be represented as:

- NOT NULL
- UNIQUE
- CHECK
- FOREIGN KEY
- partial unique indexes
- exclusion constraints where appropriate

Application validation is not a replacement for database constraints.

## Transactions

A transaction should be as small as possible while containing all state changes required for an invariant.

Never perform slow external HTTP calls inside a database transaction.

Use:

```text
transaction:
  validate
  lock/version-check
  mutate
  write outbox
commit
external async processing
```

## Optimistic concurrency

Use a version column or equivalent where concurrent updates are expected.

A failed version update must produce a domain/application conflict, not silently overwrite another actor.

## RLS

RLS policies must be tested explicitly.

Test:

- correct tenant can read
- wrong tenant cannot read
- correct vendor can access own stores
- vendor cannot access another vendor
- store manager cannot escape assigned store
- platform-level operations use an explicitly authorized path

Never use a superuser connection for normal application traffic if doing so bypasses intended RLS protection.

## Migrations

Migrations are immutable history.

Rules:

- one logical migration per change
- review generated SQL
- avoid destructive changes without a staged migration
- deploy additive schema first
- backfill separately when large
- remove old columns only after code no longer depends on them
- test rollback/recovery strategy
- never modify an already-applied migration

## Indexing

Index actual query patterns.

Common composite patterns:

```text
(tenant_id, created_at)
(vendor_id, created_at)
(store_id, status, created_at)
(order_id, ...)
```

Do not blindly index every foreign key or field.
