# Refunds Module

## Responsibility

The Refunds bounded context owns return requests, return approval workflows, refund eligibility calculation, and coordination with Payment refunds and Inventory restoration.

Refunds owns:

- Return request aggregate and return line items
- Return reasons, inspection outcomes, and approval state
- Refundable amount calculation against order/payment snapshots
- Refund command orchestration (delegates provider execution to Payment)

Refunds does not own:

- Payment provider API adapters (Payment module)
- Order aggregate root internals (invokes Order ports/methods)
- Vendor ledger entries (Payout module records financial impact)

## Rules

- Refund amount cannot exceed refundable amount for line or order
- Refunds are idempotent by command or provider reference
- Partial returns and partial refunds supported with explicit line mapping
- Inventory restoration policy documented per product type (restock vs write-off)

## Workflow

```text
ReturnRequested -> UnderReview -> Approved | Rejected
Approved -> RefundInitiated -> RefundCompleted | RefundFailed
```

Rejected returns retain audit history. Approved returns may trigger Fulfillment return shipment flows.

## Testing requirements

- Duplicate refund rejection
- Over-refund prevention
- Invalid order state for return
- Vendor isolation
- Partial line returns

## Exit criteria

- Return and refund flows integrated with Order and Payment
- Ledger impact emitted as events for Payout consumption

## Related

- [PHASES.md](../PHASES.md) — Phase 14
- [Order Module](./order.md)
- [Payment Module](./payment.md)
- [Fulfillment Module](./fulfillment.md)
