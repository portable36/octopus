# Observability

## Correlation

Every HTTP request and background job carries a correlation/request ID propagated through logs, database session context, and provider calls.

- Clients may send `x-request-id` and/or `x-trace-id`; responses echo both.
- When OpenTelemetry is enabled (`OTEL_ENABLED=true`), the active span `traceId` is preferred for `x-trace-id`.
- Otherwise `traceId` defaults to the request id.

## Tracing

- Opt-in Node SDK (`otel-bootstrap.ts`) with HTTP / Express / Nest, PostgreSQL (`pg`), and Redis (`ioredis`) instrumentations.
- BullMQ Queue/Worker constructors receive official `bullmq-otel` when `OTEL_ENABLED=true`.
- Payment refund gateway and payout disburse adapters wrap calls in `withExternalSpan` (safe ids only).
- Meilisearch adapter wraps ensure/upsert/delete/search in `withExternalSpan` (no free-text query strings).
- Export via `OTEL_EXPORTER_OTLP_ENDPOINT` (OTLP/HTTP) or console spans in non-production when no endpoint is set.
- PG spans omit bound parameter values (`enhancedDatabaseReporting: false`).
- Redis spans redact AUTH/HELLO and truncate long command args.

## Logging

- Structured JSON logs (Pino via `nestjs-pino`)
- Access logs include `requestId`, `traceId`, `operation`, `durationMs`, and when set `actorId` / `vendorId` / `storeId` / `tenantId`
- Failures log `errorCode` (domain `code` when present) via `req.log`
- Redact secrets, tokens, payment credentials, and full PII
- Log business outcomes with safe identifiers: `orderId`, `vendorId`, `paymentId`

## Metrics (minimum)

- Request latency and error rate by route (`octopus.http.server.duration` / `octopus.http.server.requests` when `OTEL_ENABLED`)
- Database latency (`db.client.operation.duration` from pg instrumentation)
- Redis latency (`octopus.redis.command.duration` on the shared Redis client)
- Queue depth and lag (`octopus.queue.depth` / `octopus.queue.lag` from outbox BullMQ queues)
- Checkout outcomes (`octopus.checkout.outcomes`)
- Payment/refund failures (`octopus.payment.failures`)
- Inventory reservation conflicts (`octopus.inventory.conflicts`)
- Search indexing lag (`octopus.search.indexing.lag`)
- Payout failures (`octopus.payout.failures`)

OTLP metrics use the same collector base URL as traces (`…/v1/metrics`).

## Errors (Sentry)

- Opt-in via `SENTRY_DSN` (Nest) and `NEXT_PUBLIC_SENTRY_DSN` (Next). Unset DSN leaves reporting off.
- Backend captures 5xx in `Rfc7807ExceptionFilter`; frontend uses `@sentry/nextjs` + `global-error`.
- `SENTRY_RELEASE` / `SENTRY_ENVIRONMENT` tag events for release tracking.
- `sendDefaultPii: false` plus `scrubSentryEvent` strips passwords, tokens, cookies, and user email/IP.

## Alerting

Alert on sustained error rate increases, queue backlog growth, payment callback failures, and readiness probe failures.

## Related

- [OPERATIONS.md](../../OPERATIONS.md)
- [production-readiness.md](./production-readiness.md)
- `.cursor/rules/13-observability.mdc`
