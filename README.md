# Production-Ready Cursor Rules — Multi-Vendor Multi-Store E-Commerce

This package is a production-oriented Cursor rules and engineering-governance baseline for:

- Next.js App Router + TypeScript
- NestJS + TypeScript
- Modular Monolith + DDD + Clean Architecture
- PostgreSQL + MikroORM
- Redis + BullMQ
- PostgreSQL RLS for tenant isolation
- S3-compatible object storage
- Meilisearch
- JWT + refresh-token authentication
- RBAC + permissions
- Bangladesh payment gateways
- Vitest + Supertest + Playwright
- Pino + OpenTelemetry + Sentry
- Docker + GitHub Actions

## Important

No ruleset can honestly guarantee a completely error-free production system. This package instead enforces architecture boundaries, security invariants, testing gates, transactional correctness, observability, and operational checks intended to make defects harder to introduce and easier to detect.

## Recommended repository layout

```text
apps/
  api/
    src/
      modules/
        auth/
        catalog/
        cart/
        checkout/
        order/
        inventory/
        vendor/
        store/
        customer/
        payment/
        payout/
        promotion/
        shipping/
        notification/
        search/
        audit/
        reporting/
      shared/
  web/
    app/
    components/
    features/
    lib/
packages/
  contracts/
  config/
  database/
  observability/
  testing/
  ui/
docs/
scripts/
infra/
.cursor/
  commands/
  rules/
```

## Rule philosophy

1. Domain code must not depend on NestJS, MikroORM, Redis, BullMQ, HTTP, or vendor SDKs.
2. Application use cases orchestrate domain behavior and ports.
3. Infrastructure implements ports.
4. Controllers validate transport input and translate responses; they do not contain business rules.
5. Cross-module access happens through explicit public application contracts, not internal imports.
6. Domain events are committed through an outbox before asynchronous publication.
7. Money, quantities, percentages, IDs, and dates use explicit value types.
8. Tenant/vendor/store authorization is deny-by-default.
9. Database transactions protect invariants; Redis locks are not a substitute for database correctness.
10. Idempotency is mandatory for externally retried commands such as payment callbacks, checkout submission, refunds, payouts, and webhook processing.
11. Every production mutation must be observable and auditable where appropriate.
12. CI must enforce formatting, linting, type checking, tests, migration validation, architecture checks, and build verification.

## Using this package

Copy the `.cursor` directory and root engineering files into your repository. Then customize:

- module names
- deployment domains
- cloud provider
- payment credentials/config
- database connection names
- exact CI deployment targets
- business-specific policies

The included scripts are deliberately conservative. Run the full validation command before merging.
