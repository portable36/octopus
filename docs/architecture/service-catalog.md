# Service Catalog

## Runtime services

| Service          | Responsibility                       | Critical deps     |
| ---------------- | ------------------------------------ | ----------------- |
| `octopus-api`    | HTTP API, auth, use cases            | PostgreSQL, Redis |
| `octopus-worker` | Outbox dispatch, BullMQ consumers    | PostgreSQL, Redis |
| `postgres`       | Source of truth                      | —                 |
| `redis`          | Cache, sessions, queues, rate limits | —                 |
| `meilisearch`    | Search read model                    | —                 |
| `object-storage` | Media binaries                       | —                 |

## Bounded context modules (backend)

See [data-ownership.md](./data-ownership.md) for the full ownership map. Implemented modules evolve per [PHASES.md](../PHASES.md).

Current code includes: `identity`, `catalog`, `pos` (partial), with additional modules documented under `docs/module/`.

## External integrations

| Provider   | Used by      | Notes                          |
| ---------- | ------------ | ------------------------------ |
| SSLCommerz | Payment      | Webhooks, signature validation |
| bKash      | Payment      | Idempotency required           |
| Nagad      | Payment      | Idempotency required           |
| Email/SMS  | Notification | Adapter behind port            |

## Related

- [system-overview.md](./system-overview.md)
- [deployment.md](./deployment.md)
- [infrastructure.md](./infrastructure.md)
