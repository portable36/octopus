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

## CI (Phase 27.1)

Pull requests and `main` run `.github/workflows/ci.yml`:

1. `validate` job — Postgres 18 + Redis 8 services, `npm run validate` (format → lint → typecheck → architecture → tests → env contract → security → migration apply → build).
2. `e2e` job — Playwright Chromium against a built frontend (after validate).

## Deployment strategies (Phase 27.2)

Policy for when a container platform / CD exists. Image build source: `backend/Dockerfile` (API). Frontend deploys as its own immutable artifact (e.g. Next standalone or static host). Workers share the API image with a different process command when separated.

| Strategy           | Octopus default                                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Rolling            | **Default** for API and workers: replace pods/tasks with the new image; readiness gate before traffic.            |
| Blue/green         | Optional for storefront / edge cutover or when you need instant traffic switch with a warm idle stack.            |
| Canary             | **Deferred** until SLOs + traffic metrics justify partial rollout automation (Phase 28+).                         |
| Automatic rollback | On failed readiness or smoke: redeploy previous image digest/tag. Do **not** down-migrate schema.                 |
| Forward recovery   | Preferred for stuck or partial migrations: fix-forward with expand/contract; keep DB ahead of old apps when safe. |

### Ordered deploy sequence

```text
build image (backend/Dockerfile)
→ registry push + vulnerability scan (ops)
→ apply additive / expand migrations
→ rolling (or blue/green) deploy API + workers
→ readiness (Postgres + Redis) + smoke
→ monitor (errors, queue lag, payment/checkout)
```

Contract: new app versions must tolerate the current schema; breaking drops wait for a later contract phase after all runners are upgraded.

Image push, registry scan, and environment deploy automation remain Phase 28 / ops (no CD pipeline in-repo yet).

## Infrastructure (Phase 28.1)

Environment and IaC policy: [infrastructure.md](./infrastructure.md) (Compose for local deps; Hostinger + Cloudflare for production; Terraform only when automating cloud resources).

## Related

- [OPERATIONS.md](../../OPERATIONS.md)
- [infrastructure.md](./infrastructure.md)
- [PRODUCTION-CHECKLIST.md](../PRODUCTION-CHECKLIST.md)
- [PHASES.md](../PHASES.md) — Phases 27–30
- `.cursor/rules/24-production-operations.mdc`
