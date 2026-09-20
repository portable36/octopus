# Infrastructure as Code

Phase 28 policy. Prefer OSS/free; paid only when free fails (see [current-baseline.md](../product/current-baseline.md)).

## Choice

| Layer           | Tool                                      | Status                                                                                                 |
| --------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Local / CI deps | **Docker Compose** (`docker-compose.yml`) | In-repo, canonical for Postgres/Redis/Meilisearch/MinIO. PG 18 volume mounts at `/var/lib/postgresql`. |

| Production host | **Hostinger** VPS (or equivalent) + app containers/process | Runbook / ops; not Terraformed yet |
| Edge DNS/TLS | **Cloudflare** | Proxy + TLS; no Cloudflare SDK in domain code |
| Cloud IaC | **Terraform** (if/when) | Preferred over Pulumi when automating DNS or managed cloud resources; **do not** invent AWS VPC modules for a single VPS |

No `infra/` Terraform tree until there is a concrete provider target and credentials path. Compose covers development reproducibility today; [`docker-compose.prod.yml`](../../docker-compose.prod.yml) is the production matrix on the VPS.

## Environments

```text
development  → docker compose (local secrets in .env; never production values)
staging      → optional Hostinger/subdomain; separate DATABASE_URL / JWT / S3
production   → Hostinger origin + Cloudflare edge; secrets from host secret store only
```

Never share production secrets with development or commit them.

## Service map

| Concern             | Development (compose)          | Production target                                            |
| ------------------- | ------------------------------ | ------------------------------------------------------------ |
| Network / edge      | localhost ports                | Cloudflare proxy → Hostinger origin                          |
| PostgreSQL          | `postgres` service             | VPS Postgres via `docker-compose.prod.yml` (or managed PG)   |
| Redis               | `redis` service                | VPS Redis via compose (cache/queues only)                    |
| Search              | `meilisearch`                  | Self-hosted Meilisearch in compose                           |
| Object storage      | `minio`                        | MinIO in compose or external S3-compatible                   |
| Application runtime | `backend` profile + local Next | GHCR image + `docker-compose.prod.yml` (API / SEO / Next)    |
| Load balancer       | n/a                            | Cloudflare as edge; host reverse proxy                       |
| DNS / TLS           | n/a                            | Cloudflare                                                   |
| Secrets             | `.env` / `.env.example`        | Host `.env` + optional `host.secrets.env` (see below)        |
| Monitoring          | local logs / OTel optional     | App OTel + `deploy/check-health.sh` + external uptime        |
| Backups             | volume data                    | [backup-disaster-recovery.md](./backup-disaster-recovery.md) |

## Host network (single-VPS — no AWS VPC)

Treat the VPS as the trust boundary. Recommended host firewall (`ufw` or equivalent):

| Allow inbound | Source                                    | Purpose                                                       |
| ------------- | ----------------------------------------- | ------------------------------------------------------------- |
| 22/tcp        | admin IP / VPN                            | SSH deploy                                                    |
| 80/tcp        | Cloudflare only (or world if origin cert) | HTTP → nginx                                                  |
| 443/tcp       | Cloudflare only                           | HTTPS → nginx                                                 |
| Deny          | public                                    | Postgres `5432`, Redis `6379`, Meilisearch, MinIO, Node ports |

Publish only nginx (or Caddy) on 80/443; keep compose service ports bound to `127.0.0.1` when exposing beyond the default matrix. Cloudflare orange-cloud + origin allowlist is preferred over opening the origin to the world.

## Secrets wiring (production)

1. On the host compose directory (default `/opt/octopus`), copy [`deploy/host.secrets.env.example`](../../deploy/host.secrets.env.example) to **`.env`** (for Compose interpolation) and/or **`host.secrets.env`** (loaded by `backend-api` / `seo-worker` when present).
2. `chmod 600` those files; never commit them.
3. Set at least: `JWT_SECRET` (≥32 chars), `DATABASE_URL`, `REDIS_URL`, `CORS_ORIGINS`, Meilisearch + S3 keys if not using compose defaults.
4. Rotate JWT with `JWT_SECRET` + `JWT_SECRET_PREVIOUS` overlap ([security.md](../engineering/security.md)).
5. Payment / courier secrets stay runtime-only on the host (not in GitHub Actions).

Compose substitutes `${JWT_SECRET:-…}` from the project `.env`. Optional `host.secrets.env` overrides process env without rebuilding the image.

## Monitoring / uptime

| Layer           | Contract                                                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Process         | Compose `healthcheck` on `backend-api` (`/api/v1/health/ready`) + storefront                                                 |
| App diagnostics | `GET /api/v1/health/live`, `/ready`, `/alerts` + admin `/admin/system/alerts`                                                |
| Host cron       | [`deploy/check-health.sh`](../../deploy/check-health.sh) every 5 minutes                                                     |
| External uptime | Point Cloudflare Health Checks / UptimeRobot / Better Stack at public `/api/v1/health/ready` (and optionally storefront `/`) |
| Pager webhook   | Optional `PAGER_WEBHOOK_URL` on `check-health.sh` (Slack/Discord/Better Stack incoming webhook on probe failure)             |

### External uptime + pager (host ops checklist)

1. **Public ready URL** — `https://<api-host>/api/v1/health/ready` must return 2xx when Postgres + Redis are up.
2. **Uptime monitor** (pick one OSS/free-first): Cloudflare Health Checks, [UptimeRobot](https://uptimerobot.com/), or Better Stack — interval ≤ 5m, alert on non-2xx / timeout.
3. **Host cron** — `*/5 * * * * API_BASE=https://<api-host>/api/v1 STORE_BASE=https://<storefront> /opt/octopus/deploy/check-health.sh >>/var/log/octopus-health.log 2>&1`
4. **Pager** — set `PAGER_WEBHOOK_URL` in the cron environment (or host `.env` exported for cron) so failures notify Slack/Discord/Better Stack.
5. **Escalation** — on alert: check `GET /health/alerts`, compose `ps`, recent deploy digest; do not restart Postgres blindly during restore.

OTel remains optional in-app; Prometheus burn-rate stays optional host ops.

## Related

- [deployment.md](./deployment.md)
- [backup-disaster-recovery.md](./backup-disaster-recovery.md)
- [OPERATIONS.md](../../OPERATIONS.md)
- [PHASES.md](../PHASES.md) — Phase 28
- `.cursor/rules/24-production-operations.mdc`
