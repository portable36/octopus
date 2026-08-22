# Cross-Module Communication

## Principles

Bounded contexts communicate without violating module boundaries:

1. **Synchronous**: narrow application-layer ports returning explicit DTOs
2. **Asynchronous**: domain events inside a module; integration events across modules via transactional outbox

Never import another module's domain, infrastructure, or ORM layers directly.

## Allowed patterns

```text
Module A application port <- Module B application service (adapter)
Module A outbox event -> worker -> Module B command handler
```

## Forbidden patterns

```text
Module A -> Module B ORM entity
Module A -> Module B repository implementation
Module A -> Module B internal domain aggregate
Shared mutable global service hiding cross-module calls
```

## Event categories

| Type              | Scope              | Delivery        |
| ----------------- | ------------------ | --------------- |
| Domain event      | Inside module      | In-process OK   |
| Integration event | Cross-module/async | Outbox required |

## Validation

Run `npm.cmd run architecture` after changes that add imports or new cross-module calls.

## Related

- [ADR-0002](../adr/ADR-0002-event-driven-architecture.md)
- [system-overview.md](./system-overview.md)
- `.cursor/rules/02-architecture-boundaries.mdc`
- `.cursor/rules/07-events-outbox-queues.mdc`
