# Production Operations

## Health endpoints

Expose separate endpoints:

- liveness: process is running
- readiness: dependencies required for serving traffic are healthy
- startup: application initialization state where useful

Do not make liveness depend on PostgreSQL.

## Graceful shutdown

On SIGTERM:

1. Stop accepting new traffic.
2. Stop consuming new jobs.
3. Allow in-flight requests/jobs to finish within a timeout.
4. Flush telemetry/logs.
5. Close Redis/database connections.
6. Exit.

## Queues

Every BullMQ job must define:

- stable job name
- payload schema
- retry policy
- exponential/backoff strategy where appropriate
- attempts
- timeout
- idempotency strategy
- dead-letter/failure handling
- metrics

Do not retry permanent validation errors.

## Observability

Every request should carry a correlation/trace ID.

Measure:

- request latency
- error rate
- DB latency
- Redis latency
- queue depth
- queue processing latency
- payment callback failures
- checkout failure rate
- search indexing lag
- payout failures

## Deployment

Use immutable container images.

Recommended deployment sequence:

```text
build
-> unit tests
-> integration tests
-> migration verification
-> security/dependency checks
-> image build
-> image scan
-> deploy
-> migration
-> readiness verification
-> smoke tests
-> monitor
```

For schema changes use expand/contract migrations.

Deployment **strategy** defaults (rolling first; blue/green optional; canary deferred; rollback = previous image, not down-migrate; prefer forward recovery): [docs/architecture/deployment.md](./docs/architecture/deployment.md). Environments / IaC: [docs/architecture/infrastructure.md](./docs/architecture/infrastructure.md).

## Backups

Backups must be:

- automated
- encrypted
- retained according to policy
- monitored
- periodically restored in a test environment

A backup that has never been restored is not a proven recovery mechanism.

## Incident readiness

Maintain:

- runbooks
- rollback procedure
- payment outage procedure
- queue backlog procedure
- database failover procedure
- search outage procedure
- credential rotation procedure
