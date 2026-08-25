# Testing Strategy

## Test pyramid

### Domain unit tests

Fast tests for:

- aggregates
- value objects
- policies
- pricing rules
- order state transitions
- commission calculations
- inventory rules

No database, Redis, NestJS, or network.

### Application tests

Test:

- authorization
- transactions
- repository interactions
- idempotency
- event/outbox behavior
- use-case orchestration

### Integration tests

Use real PostgreSQL/Redis containers where correctness depends on:

- SQL constraints
- RLS
- transactions
- locking
- queues

Do not replace database behavior with mocks when the behavior under test is database-specific.

### API tests

Supertest against the NestJS application.

Cover:

- auth
- authorization
- tenant isolation
- validation
- pagination
- idempotency
- error contracts

### E2E

[Playwright](https://playwright.dev/) covers critical business journeys. Scaffold lives in `e2e/` (`npm.cmd run test:e2e`). See [e2e/README.md](./e2e/README.md).

Target journeys as the product grows:

1. Customer registration/login.
2. Browse/search.
3. Multi-vendor cart.
4. Checkout.
5. Payment success/failure.
6. Order history.
7. Vendor login.
8. Product creation.
9. Inventory adjustment.
10. Fulfillment.
11. Refund/return.
12. Vendor payout statement.
13. Admin vendor approval.

## Required negative tests

Every privileged endpoint needs at least:

- unauthenticated
- authenticated but wrong role
- authenticated but wrong tenant
- authenticated but wrong vendor
- authenticated but wrong store
- malformed input
- stale/concurrent mutation where applicable

## Production gates

A merge should fail if:

- formatting fails
- lint fails
- type checking fails
- architecture checks fail
- domain/application tests fail
- integration tests fail
- API tests fail
- E2E smoke tests fail
- migrations cannot apply to a clean database
- build fails
