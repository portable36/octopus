# Production Readiness

Use this checklist for every feature that crosses a module or process boundary.

## Correctness

- [ ] Domain invariants are enforced by an aggregate or value object.
- [ ] Authorization is checked using server-derived tenant/vendor/store scope.
- [ ] Mutations define transaction, idempotency, timeout, retry, and failure behavior.
- [ ] Money uses integer minor units and an explicit currency.
- [ ] External side effects are outbox-backed when consistency requires it.

## Security

- [ ] Inputs are schema-validated, bounded, and reject unknown fields where appropriate.
- [ ] CORS origins, credentials, methods, and headers are explicit and environment-driven.
- [ ] Secrets and personal/payment data are excluded or redacted from logs and telemetry.
- [ ] Privileged and cross-tenant negative tests exist.

## Operations

- [ ] Correlation IDs and structured outcomes are emitted across request and worker boundaries.
- [ ] Dependency readiness, queue lag, failures, and business-critical metrics are observable.
- [ ] Database migrations are reviewed, additive where possible, and tested on a clean database.
- [ ] Deployment rollback or forward-recovery steps are documented.

## Verification

- [ ] `npm.cmd run format:check`
- [ ] `npm.cmd run lint`
- [ ] `npm.cmd run typecheck`
- [ ] `npm.cmd run architecture`
- [ ] `npm.cmd run test`
- [ ] `npm.cmd run security`
- [ ] `npm.cmd run validate`
