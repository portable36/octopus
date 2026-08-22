# Octopus — Multi-Vendor Multi-Store E-Commerce Platform

A production-oriented engineering-governance baseline and modular-monolith codebase for:

- NestJS-style modular monolith + TypeScript strict mode
- Domain-Driven Design + Clean Architecture (`domain` → `application` → `infrastructure`)
- Next.js App Router frontend (planned)
- PostgreSQL + MikroORM + Row-Level Security for tenant isolation
- Redis + BullMQ
- Meilisearch read models
- JWT + refresh-token authentication, RBAC + permissions
- Bangladesh payment gateways (SSLCommerz, bKash, Nagad)
- Vitest tests, ESLint, Prettier, architecture boundary checks, GitHub Actions CI

## Important

No ruleset can honestly guarantee a completely error-free production system. This repository enforces architecture boundaries, security invariants, testing gates, transactional correctness, observability, and operational checks intended to make defects harder to introduce and easier to detect.

## Repository layout

```text
src/
  shared-kernel/
    domain/            # AggregateRoot, ValueObject, UniqueId, Money
    infrastructure/    # Cross-cutting concerns (AsyncLocalStorage tenant context)
  modules/
    [context]/         # Bounded context (identity, pos, ...)
      domain/          # Pure TypeScript aggregates, value objects, events
      application/     # CQRS commands/queries + ports (planned per phase)
      infrastructure/  # Controllers, persistence adapters (planned per phase)
docs/
  PHASES.md            # Canonical 30-phase implementation roadmap
  POS.md               # POS bounded context specification
.cursor/
  commands/
  rules/               # Numbered governance rules (.mdc), applied by Cursor
scripts/               # Validation tooling
```

## Rule philosophy

1. Domain code must not depend on NestJS, MikroORM, Redis, BullMQ, HTTP, or vendor SDKs.
2. Application use cases orchestrate domain behavior and ports.
3. Infrastructure implements ports.
4. Controllers validate transport input and translate responses; they do not contain business rules.
5. Cross-module access happens through explicit public application contracts, not internal imports.
6. Domain events are committed through an outbox before asynchronous publication.
7. Money, quantities, percentages, IDs, and dates use explicit value types (integer minor units).
8. Tenant/vendor/store authorization is deny-by-default.
9. Database transactions protect invariants; Redis locks are not a substitute for database correctness.
10. Idempotency is mandatory for externally retried commands such as payment callbacks, checkout submission, refunds, payouts, and webhook processing.

## Commands

```bash
npm install          # install toolchain
npm run format       # prettier write
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm run architecture # layer-boundary + cross-module import checks
npm test             # vitest unit tests
npm run security     # npm audit
npm run validate     # full local gate pipeline
```

CI runs the same gates on every push and pull request. Migration validation and build steps will be reintroduced as Phase 00+ of `docs/PHASES.md` lands.
