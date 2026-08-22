# Review Change for Production

Review the change against:

- DDD boundaries
- Clean Architecture dependency direction
- tenant/vendor/store isolation
- authorization
- transaction boundaries
- idempotency
- money correctness
- inventory concurrency
- payment callback security
- outbox/event consistency
- API contract stability
- logging/PII safety
- performance
- tests
- migrations
- observability
- rollback behavior

Report findings by severity:

```text
BLOCKER
HIGH
MEDIUM
LOW
```

Do not call a change production-ready if a BLOCKER or HIGH issue remains unresolved.
