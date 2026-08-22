# ADR-0002: Event-Driven Architecture

## Status

Proposed

## Context

Bounded contexts must communicate without violating module boundaries or sharing internal persistence models. Some workflows require asynchronous side effects after a transaction commits.

## Decision

Use domain events inside a bounded context and integration events across contexts. Publish externally only through a transactional outbox after the database transaction commits.

## Consequences

Positive:

- preserves modular monolith boundaries
- supports retries and idempotent consumers
- enables future service extraction

Negative:

- requires outbox processing and observability
- duplicate delivery must be handled explicitly

## Related

- [ADR-0001: Modular Monolith](./ADR-0001-modular-monolith.md)
- [ARCHITECTURE.md](../../ARCHITECTURE.md)
- [PHASES.md](../PHASES.md)
