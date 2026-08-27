# Infrastructure as Code

Phase 28 policy. Prefer OSS/free; paid only when free fails (see [current-baseline.md](../product/current-baseline.md)).

## Choice

| Layer           | Tool                                                       | Status                                                                                                                   |
| --------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Local / CI deps | **Docker Compose** (`docker-compose.yml`)                  | In-repo, canonical for Postgres/Redis/Meilisearch/MinIO                                                                  |
| Production host | **Hostinger** VPS (or equivalent) + app containers/process | Runbook / ops; not Terraformed yet                                                                                       |
| Edge DNS/TLS    | **Cloudflare**                                             | Proxy + TLS; no Cloudflare SDK in domain code                                                                            |
| Cloud IaC       | **Terraform** (if/when)                                    | Preferred over Pulumi when automating DNS or managed cloud resources; **do not** invent AWS VPC modules for a single VPS |

No `infra/` Terraform tree until there is a concrete provider target and credentials path. Compose covers development reproducibility today.

## Environments

```text
development  → docker compose (local secrets in .env; never production values)
staging      → optional Hostinger/subdomain; separate DATABASE_URL / JWT / S3
production   → Hostinger origin + Cloudflare edge; secrets from host secret store only
```

Never share production secrets with development or commit them.

## Service map

| Concern             | Development (compose)          | Production target                                        |
| ------------------- | ------------------------------ | -------------------------------------------------------- |
| Network / edge      | localhost ports                | Cloudflare proxy → Hostinger origin                      |
| PostgreSQL          | `postgres` service             | VPS Postgres or managed PG                               |
| Redis               | `redis` service                | VPS Redis (cache/queues only)                            |
| Search              | `meilisearch`                  | Self-hosted Meilisearch or equivalent                    |
| Object storage      | `minio`                        | S3-compatible (MinIO / R2 / provider)                    |
| Application runtime | `backend` profile + local Next | Immutable API image (`backend/Dockerfile`) + Next deploy |
| Load balancer       | n/a                            | Cloudflare as edge; host reverse proxy                   |
| DNS / TLS           | n/a                            | Cloudflare                                               |
| Secrets             | `.env` / `.env.example`        | Host/env secret manager; fail-closed config              |
| Monitoring          | local logs / OTel optional     | App OTel + host/process checks (ops)                     |
| Backups             | volume data                    | Phase 29 runbooks                                        |

## Related

- [deployment.md](./deployment.md)
- [OPERATIONS.md](../../OPERATIONS.md)
- [PHASES.md](../PHASES.md) — Phase 28
- `.cursor/rules/24-production-operations.mdc`
