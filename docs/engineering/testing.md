# Testing Strategy (Engineering)

## Canonical reference

Detailed pyramid and E2E journeys: [TESTING.md](../../TESTING.md).

## Layer guidance

| Layer       | Proves                           | Tools                                                                  |
| ----------- | -------------------------------- | ---------------------------------------------------------------------- |
| Domain unit | Invariants, state machines       | Vitest                                                                 |
| Application | Authz, transactions, idempotency | Vitest + mocks/DB                                                      |
| Integration | SQL, RLS, locking, queues        | Vitest + containers                                                    |
| API         | HTTP contracts, tenant isolation | Supertest                                                              |
| E2E         | Critical user journeys           | [Playwright](https://playwright.dev/) (`e2e/`, `npm.cmd run test:e2e`) |

## Coverage map (Phase 26.1)

Backend Vitest lives next to code under `backend/src/**/*.spec.ts` (run via root `npm.cmd run test`). High-signal clusters:

| Area            | Examples                                                                     |
| --------------- | ---------------------------------------------------------------------------- |
| Money / finance | `money.value-object`, payment/refund aggregates, commission clawback         |
| Inventory       | `inventory-item.aggregate`, `concurrent-reservation`                         |
| Checkout/order  | `checkout.handlers`, `order.aggregate`                                       |
| Authn/authz     | login/MFA/refresh, `AuthorizationService`, password policy                   |
| Outbox/queues   | `outbox-dispatcher`, BullMQ defaults, search indexing processor              |
| Tenancy         | `scope-policy`, `tenant-isolation.rls.integration` (Postgres required)       |
| Redis           | `identity/.../redis.integration` (login + API rate limiters; `REDIS_URL`)    |
| HTTP contracts  | RFC7807 filter, pagination clamps, `test/api/http-auth.contract` (Supertest) |

Playwright (`e2e/smoke.spec.ts`): storefront home/browse/search/cart/login/register page smokes + admin dashboard shell. Authenticated revenue paths still open.

API contract harness: `backend/src/test/api/create-api-test-app.ts` boots a minimal Nest app with real `JwtAuthGuard` / `PermissionsGuard` (factory-wired for Vitest). Full `AppModule` + Redis/Postgres boot remains a follow-up.

Redis / Postgres integration suites use `describe.runIf` on `REDIS_URL` / `DATABASE_URL` so local `validate` stays green without services; CI sets both.

## When to add tests

Every behavior change needs the smallest test that proves the invariant or failure mode. Financial, inventory, and authorization paths require negative tests.

## E2E (Playwright)

- Config: `playwright.config.ts` · specs: `e2e/` · guide: [e2e/README.md](../../e2e/README.md)
- Install browsers once: `npx.cmd playwright install chromium`
- Not part of `validate` (browser + Next server). Run locally / CI e2e job separately.

## Validation gate

Run `npm.cmd run validate` before merge. Report exact test file and test counts; do not treat counts as permanent contracts.

## Related

- [TESTING.md](../../TESTING.md)
- [production-readiness.md](./production-readiness.md)
- `.cursor/rules/12-testing.mdc`
- `.cursor/rules/23-testing-validation.mdc`
