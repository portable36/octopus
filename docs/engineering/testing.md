# Testing Strategy (Engineering)

## Canonical reference

Detailed pyramid and E2E journeys: [TESTING.md](../../TESTING.md).

## Layer guidance

| Layer       | Proves                           | Tools               |
| ----------- | -------------------------------- | ------------------- |
| Domain unit | Invariants, state machines       | Vitest              |
| Application | Authz, transactions, idempotency | Vitest + mocks/DB   |
| Integration | SQL, RLS, locking, queues        | Vitest + containers |
| API         | HTTP contracts, tenant isolation | Supertest           |
| E2E         | Critical user journeys           | Playwright          |

## When to add tests

Every behavior change needs the smallest test that proves the invariant or failure mode. Financial, inventory, and authorization paths require negative tests.

## Validation gate

Run `npm.cmd run validate` before merge. Report exact test file and test counts; do not treat counts as permanent contracts.

## Related

- [TESTING.md](../../TESTING.md)
- [production-readiness.md](./production-readiness.md)
- `.cursor/rules/12-testing.mdc`
- `.cursor/rules/23-testing-validation.mdc`
