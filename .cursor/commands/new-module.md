# Create a New Bounded Context Module

When creating a module:

1. Define its business responsibility.
2. Define aggregate roots and invariants.
3. Define owned persistence data.
4. Define public application contracts.
5. Define domain events.
6. Define integration ports.
7. Add repository interfaces.
8. Implement infrastructure adapters.
9. Implement use cases.
10. Add controllers/consumers.
11. Add authorization tests.
12. Add tenant isolation tests.
13. Add integration tests where database behavior matters.
14. Update architecture documentation.

Required structure:

```text
<module>/
  domain/
    entities/
    value-objects/
    services/
    events/
    repositories/
    errors/
  application/
    commands/
    queries/
    dto/
    ports/
  infrastructure/
    persistence/
    messaging/
    integrations/
  presentation/
    http/
    consumers/
```

Do not create cross-module imports into another module's internal layers.
