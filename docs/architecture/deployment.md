# Deployment

## Targets

- **Local**: Docker Compose for PostgreSQL, Redis, Meilisearch, MinIO, and backend dev container
- **Production**: immutable container images, rolling or blue/green deploys, separate worker processes for queues

## Components

```text
Internet -> reverse proxy / TLS termination
         -> API (NestJS)
         -> Worker (BullMQ consumers)
         -> PostgreSQL (+ PgBouncer where used)
         -> Redis
         -> Meilisearch
         -> Object storage (S3-compatible)
```

## Migration policy

- Apply migrations before or during deploy per runbook
- Expand/contract sequence for breaking schema changes
- Verify on clean DB and upgrade DB in CI

## Configuration

- Secrets from environment/secret manager only
- `.env.example` documents required keys without values
- Production config validated at startup (fail closed)

## Health and readiness

Separate liveness and readiness probes. Readiness includes PostgreSQL and Redis when required for serving traffic.

## Related

- [OPERATIONS.md](../../OPERATIONS.md)
- [PRODUCTION-CHECKLIST.md](../PRODUCTION-CHECKLIST.md)
- [PHASES.md](../PHASES.md) — Phases 27–30
- `.cursor/rules/24-production-operations.mdc`
