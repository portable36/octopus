# Check Production Readiness

Inspect the change for:

- invariant and state-transition correctness
- authorization and tenant isolation
- transaction and concurrency behavior
- idempotency and retry semantics
- API compatibility
- migration safety
- timeout and provider failure behavior
- logs, metrics, traces, and alertability
- rollback or forward recovery
- regression and negative tests

Run `npm.cmd run validate`. Do not call the change production-ready if a deterministic check fails or a high-severity risk is unresolved.
