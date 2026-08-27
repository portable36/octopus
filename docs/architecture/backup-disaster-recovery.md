# Backup & Disaster Recovery

Phase 29 policy for Hostinger + Cloudflare (see [infrastructure.md](./infrastructure.md)). Postgres is the system of record for money, inventory, orders, and identity.

## Targets (RTO / RPO)

| Class                    | RPO (max data loss)                                  | RTO (max downtime)             | Notes                                                    |
| ------------------------ | ---------------------------------------------------- | ------------------------------ | -------------------------------------------------------- |
| PostgreSQL (truth)       | **≤ 24h** baseline; **≤ 1h** when WAL/PITR available | **≤ 4h** restore to known-good | Tighten when managed PG + continuous WAL is wired        |
| Object storage (media)   | ≤ 24h                                                | ≤ 8h                           | Versioning preferred; catalog still works without images |
| Redis                    | n/a (ephemeral)                                      | ≤ 15m (empty/restart)          | Never sole copy of business truth                        |
| Meilisearch              | n/a (rebuildable)                                    | ≤ 4h reindex                   | Rebuild from Postgres via search indexing                |
| Application (API / Next) | n/a                                                  | ≤ 30m redeploy                 | Immutable image + previous digest rollback               |

## PostgreSQL

| Control            | Policy                                                                                                               |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Automated backups  | Daily full dump (or provider snapshot) minimum; enable continuous WAL / PITR when the host or managed PG supports it |
| Encryption         | At rest on backup media; in transit via TLS to storage                                                               |
| Retention          | **30 days** daily; keep one monthly for **12 months**                                                                |
| Restore testing    | Quarterly restore into an isolated database; record time-to-ready                                                    |
| Migration coupling | Prefer expand/contract so restored schema matches a deployable app                                                   |

Until production automation exists, treat this as the ops contract — not as “already running.”

## Redis (reconstructable vs not)

Redis **must not** hold the only copy of financial or inventory state.

| Data                                  | Reconstructable? | After Redis loss                                                  |
| ------------------------------------- | ---------------- | ----------------------------------------------------------------- |
| Login rate limits                     | Yes (empty)      | Counters reset; users may retry                                   |
| API rate limits                       | Yes (empty)      | Counters reset                                                    |
| Password-reset / MFA challenge tokens | Yes (empty)      | Users restart the flow                                            |
| Refresh sessions / families           | Partial          | Users re-login; access JWTs still expire normally                 |
| Storefront config cache               | Yes              | Read-through from Postgres                                        |
| Outbox processed NX keys              | Yes (risk)       | Brief duplicate consumer risk until TTL; handlers stay idempotent |
| BullMQ job state                      | Partial          | Re-drive from outbox / retry; inspect DLQ                         |

Do not add durable business writes that only live in Redis.

## Object storage

| Control         | Policy                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------- |
| Versioning      | Enable on the production bucket when the provider supports it                                                 |
| Lifecycle       | Expire non-current versions after **90 days**; abort incomplete uploads after **7 days**                      |
| Backup strategy | Rely on provider durability + versioning; optional periodic sync to a second bucket/region when budget allows |
| App expectation | Media is referenced by id; missing objects degrade UX, not ledger truth                                       |

## Disaster recovery runbook (outline)

1. **Declare** — severity, blast radius (checkout / payments / admin), communicator.
2. **Stabilize** — Cloudflare maintenance or fail closed on write paths if data integrity is uncertain.
3. **Restore Postgres** — latest verified backup (or PITR to timestamp); verify migrations; do **not** down-migrate to match an old app.
4. **Redeploy API + workers** — image digest known-good with the restored schema; run readiness (Postgres + Redis).
5. **Redis** — empty start is OK; force re-login if sessions were lost.
6. **Search** — trigger reindex from admin/ops job; do not treat Meilisearch as truth.
7. **Media** — restore or accept gaps; confirm S3 credentials.
8. **Verify** — smoke: login, catalog, cart, COD checkout path, admin health; check payment/outbox lag.
9. **Postmortem** — within 5 business days; update this doc if RTO/RPO were missed.

## Restore drill

- Cadence: **at least quarterly** for Postgres restore-to-empty-host (production).
- Local proof: `npm.cmd run restore:drill` (requires `docker compose up -d postgres`). Dumps `octopus`, restores into `octopus_restore_drill`, prints elapsed ms.
- Record: backup id, start/end timestamps, measured RTO, gaps found.
- A backup that has never been restored is not proven.

## Related

- [OPERATIONS.md](../../OPERATIONS.md)
- [infrastructure.md](./infrastructure.md)
- [deployment.md](./deployment.md)
- [PRODUCTION-CHECKLIST.md](../PRODUCTION-CHECKLIST.md)
- [PHASES.md](../PHASES.md) — Phase 29
