# Observability

## Correlation

Every HTTP request and background job carries a correlation/request ID propagated through logs, database session context, and provider calls.

## Logging

- Structured JSON logs (Pino)
- Redact secrets, tokens, payment credentials, and full PII
- Log business outcomes with safe identifiers: `orderId`, `vendorId`, `paymentId`

## Metrics (minimum)

- Request latency and error rate by route
- Database and Redis latency
- Queue depth and job processing time
- Payment callback failures
- Checkout failure rate
- Search indexing lag

## Tracing

Adopt distributed tracing where infrastructure supports it. Span external provider calls with timeouts recorded.

## Alerting

Alert on sustained error rate increases, queue backlog growth, payment callback failures, and readiness probe failures.

## Related

- [OPERATIONS.md](../../OPERATIONS.md)
- [production-readiness.md](./production-readiness.md)
- `.cursor/rules/13-observability.mdc`
