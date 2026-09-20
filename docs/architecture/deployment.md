# Deployment

## Targets

- **Local**: Docker Compose for PostgreSQL, Redis, Meilisearch, MinIO, and backend dev container (`docker-compose.yml`)
- **Production / staging matrix**: root `Dockerfile` + `docker-compose.prod.yml` (API, SEO worker, storefront, Postgres, Redis)
- **Production (hosted)**: immutable container images, rolling or blue/green deploys, separate worker processes for queues

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

## Origin nginx (API / SEO)

Origin reverse proxy config: [`deploy/nginx/nginx.conf`](../../deploy/nginx/nginx.conf).

| Setting          | Value                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Upstream         | `127.0.0.1:3000` (Nest `PORT` default; change if API listens on 4000 in Compose prod)                                     |
| Gzip             | `text/xml`, `application/xml`, `application/json` (+ common text types)                                                   |
| Security headers | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, strict API CSP (`default-src 'none'; frame-ancestors 'none'`) |
| Rate limit       | `limit_req` on `/api/` only — 10 r/s, burst 20; sitemaps/robots exempt                                                    |
| Proxied paths    | `/api/`, `/sitemap.xml`, `/sitemaps/`, `/robots.txt`; other paths return 444                                              |

Set Nest `TRUST_PROXY_HOPS` so `req.ip` / IP-block middleware see the real client: **1** behind nginx only, **2** behind Cloudflare + nginx (see [`.env.example`](../../.env.example)).

## CI (Phase 27.1)

Pull requests and `main` run `.github/workflows/ci.yml`:

1. `validate` job — Postgres 18 + Redis 8 services, `npm run validate` (format → lint → typecheck → architecture → tests → env contract → security → migration apply → build).
2. `e2e` job — Playwright Chromium against a built frontend (after validate).

Pushes to `main` (and manual `workflow_dispatch`) run `.github/workflows/deploy.yml`:

1. **gate-and-build** — Node.js **22**, format → typecheck → architecture → tests → `build:backend` / `build:frontend` (ephemeral Postgres/Redis; no repo secrets required).
2. **publish-image** — build root `Dockerfile`, push to **GHCR** (`ghcr.io/<owner>/<repo>:<sha>` and `:main`) using `GITHUB_TOKEN` (`packages: write`). Optional Trivy scan is informational (`continue-on-error`).
3. **deploy-ssh** — runs only when `DEPLOY_SSH_HOST`, `DEPLOY_SSH_USER`, and `DEPLOY_SSH_PRIVATE_KEY` are set; SCPs [`deploy/host-pull-roll.sh`](../../deploy/host-pull-roll.sh) and rolls `docker-compose.prod.yml` with `OCTOPUS_IMAGE=<sha tag>`, readiness on `/api/v1/health/ready`, rollback to previous image digest on timeout.

Compose services use `image: ${OCTOPUS_IMAGE:-octopus:prod}` so the host can pull without rebuilding.

### Repository secrets (SSH image deploy)

Configure under **Settings → Secrets and variables → Actions**:

**SSH (required for remote deploy job)**

- [x] Wired in `deploy.yml` when present: `DEPLOY_SSH_HOST`, `DEPLOY_SSH_USER`, `DEPLOY_SSH_PRIVATE_KEY`
- [ ] `DEPLOY_SSH_HOST` — production host hostname or IP
- [ ] `DEPLOY_SSH_USER` — deploy user on the host
- [ ] `DEPLOY_SSH_PRIVATE_KEY` — private key (ed25519/RSA) paired with `authorized_keys` on the host
- [ ] `DEPLOY_SSH_PORT` — optional; defaults to 22
- [ ] `DEPLOY_COMPOSE_DIR` — optional; defaults to `/opt/octopus` (must contain `docker-compose.prod.yml`)

**GHCR**

- [x] `GITHUB_TOKEN` (automatic) — push to `ghcr.io/<owner>/<repo>`
- Host must `docker login ghcr.io` (read package) for the deploy user / machine identity

**Optional Actions variables** (Settings → Variables)

- [ ] `NEXT_PUBLIC_API_BASE_URL` / `NEXT_PUBLIC_SITE_URL` — baked into the storefront image at build time

**Runtime / data plane (host env — never commit)**

Copy [`deploy/host.secrets.env.example`](../../deploy/host.secrets.env.example) to `/opt/octopus/.env` and/or `host.secrets.env` (`chmod 600`). Compose interpolates `${VAR}`; app services optionally load `host.secrets.env`.

- [x] Template + compose `${VAR}` / optional `env_file` wiring (Phase 28.2)
- [ ] Host filled: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` (≥32), `CORS_ORIGINS`
- [ ] Host filled: `MEILISEARCH_*`, `S3_*`
- [ ] Payment / courier secrets — runtime host only
- [ ] `SENTRY_DSN` — optional

## Production Compose matrix

Full local/staging stack from the monorepo root image:

| Artifact                                                   | Role                                                                                                                                                                                     |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root [`Dockerfile`](../../Dockerfile)                      | Multi-stage `node:22-alpine` image (`octopus:prod`): builds backend + frontend, prunes devDependencies, runs as `USER node`, exposes **4000** (API) and **3000** (storefront)            |
| [`docker-compose.prod.yml`](../../docker-compose.prod.yml) | `backend-api`, `seo-worker` (same image, `npm run start:seo-worker -w backend`), `frontend-store`, plus healthy `postgres` / `redis` volumes (Meilisearch + MinIO kept as required deps) |

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml logs -f backend-api seo-worker frontend-store
```

Smoke: `http://localhost:4000/api/v1/health/live` and `http://localhost:3000`.

`backend-api` waits for PostgreSQL and Redis **healthy** before start. Storefront `PORT=3000`; API `PORT=4000`.

Lean API-only drill image remains [`backend/Dockerfile`](../../backend/Dockerfile) (see deploy drill below).

## Deployment strategies (Phase 27.2)

Policy for when a container platform / CD exists. **Primary image:** root `Dockerfile` (API + storefront artifacts + workers). Workers share that image with a different process command. `backend/Dockerfile` is the lean API-only path for drills.

| Strategy           | Octopus default                                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Rolling            | **Default** for API and workers: replace pods/tasks with the new image; readiness gate before traffic.            |
| Blue/green         | Optional for storefront / edge cutover or when you need instant traffic switch with a warm idle stack.            |
| Canary             | **Deferred** until SLOs + traffic metrics justify partial rollout automation (Phase 28+).                         |
| Automatic rollback | On failed readiness or smoke: redeploy previous image digest/tag. Do **not** down-migrate schema.                 |
| Forward recovery   | Preferred for stuck or partial migrations: fix-forward with expand/contract; keep DB ahead of old apps when safe. |

### Ordered deploy sequence

```text
build image (root Dockerfile → octopus:prod / GHCR sha tag)
→ registry push + optional Trivy (deploy.yml publish-image)
→ apply additive / expand migrations (host / ops)
→ rolling pull via deploy/host-pull-roll.sh (SSH when secrets set)
→ readiness (Postgres + Redis) + smoke
→ monitor (errors, queue lag, payment/checkout)
```

Postgres backups on the host: [`deploy/backup-postgres.sh`](../../deploy/backup-postgres.sh) (daily cron; see [backup-disaster-recovery.md](./backup-disaster-recovery.md)).

Contract: new app versions must tolerate the current schema; breaking drops wait for a later contract phase after all runners are upgraded.

Image push to GHCR and optional SSH pull-roll are in `.github/workflows/deploy.yml`. Host package visibility (GHCR read) and first-time compose checkout under `DEPLOY_COMPOSE_DIR` remain ops setup.

## Local deploy / rollback drill (Phase 30)

Prove the immutable-image path without a production host:

```text
npm.cmd run deploy:drill
```

Requires Docker and `docker compose up -d postgres redis`. The script builds `backend/Dockerfile`, tags `octopus-api:drill-a` / `drill-b`, runs A → B (rolling deploy) → A (rollback to previous image), and asserts `/api/v1/health/live` + `/ready` after each switch. Schema is never down-migrated.

Optional: `DEPLOY_DRILL_SKIP_BUILD=1`, `DEPLOY_DRILL_PORT=13100`, `DEPLOY_DRILL_KEEP=1`.

Quarterly **production** drills still redeploy the previous registry digest on the real host and record wall-clock RTO in ops notes.

## Infrastructure (Phase 28.1)

Environment and IaC policy: [infrastructure.md](./infrastructure.md) (Compose for local deps; Hostinger + Cloudflare for production; Terraform only when automating cloud resources).

## Related

- [OPERATIONS.md](../../OPERATIONS.md)
- [infrastructure.md](./infrastructure.md)
- [PRODUCTION-CHECKLIST.md](../PRODUCTION-CHECKLIST.md)
- [PHASES.md](../PHASES.md) — Phases 27–30
- `.cursor/rules/24-production-operations.mdc`
