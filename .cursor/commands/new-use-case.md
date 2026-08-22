# Create a Use Case

For every use case define:

```text
Command/Query DTO
Actor/context requirements
Authorization policy
Validation
Aggregate/repository dependencies
Transaction boundary
Domain behavior
Outbox events
Idempotency requirements
Response DTO
Error codes
Unit tests
Integration tests where required
```

Use cases should express business intent, not CRUD mechanics.

Bad:

```text
updateOrderStatus(id, status)
```

Prefer intent:

```text
markOrderPaid(...)
cancelOrder(...)
confirmFulfillment(...)
requestRefund(...)
```
