# Order Module

## Responsibility

The Order bounded context owns order aggregates, order lines, immutable pricing snapshots, payment linkage metadata, fulfillment status coordination, and the order state machine.

Order owns:

- Order aggregate and human-readable order number
- Customer, vendor, and store references
- Order lines with variant, quantity, and price/tax/shipping snapshots
- Address and shipping snapshots at time of purchase
- Order status and payment status fields coordinated with Payment/Fulfillment
- Cancellation, refund-request, and return-request states where applicable

Order does not own:

- Payment provider execution (Payment module)
- Shipment tracking records (Fulfillment module)
- Live inventory quantities (Inventory module)
- Vendor ledger entries (Payout module)

## State machine

```text
PENDING_PAYMENT -> PAID -> PROCESSING -> PARTIALLY_FULFILLED -> FULFILLED -> COMPLETED
```

Failure and exception paths:

```text
PENDING_PAYMENT -> PAYMENT_FAILED
PAID -> CANCELLED
PAID -> REFUND_REQUESTED
FULFILLED -> RETURN_REQUESTED -> RETURNED
```

Status changes use domain methods (`markPaid`, `cancel`, `requestRefund`). Arbitrary string assignment is forbidden.

## Snapshots

Orders store immutable snapshots sufficient to explain charged amounts without re-querying live catalog or promotion state.

## Events

```text
OrderCreated
OrderPaid
OrderCancelled
OrderFulfillmentUpdated
OrderCompleted
RefundRequested
ReturnRequested
```

## Public contracts

- Customer order history (scoped)
- Vendor/store order operations (scoped)
- Platform admin read with explicit permission

## Testing requirements

- Valid and invalid transitions
- Partial fulfillment updates
- Vendor/store isolation on reads and mutations
- Concurrent status updates and optimistic concurrency

## Exit criteria

- [x] Order aggregate and state machine implemented
- [x] Payment and Fulfillment integrate through ports/events only (`ORDER_PORT` from Order module; Payment module Phase 11 owns `markPaidFromPayment` / COD collect)
- Orders persist `paymentMethod`; unpaid COD may enter `PROCESSING` by domain policy; storefront has no mark-paid endpoint
- [x] Snapshot invariants covered by domain tests

## Related

- [PHASES.md](../PHASES.md) — Phase 10
- [ARCHITECTURE.md](../../ARCHITECTURE.md) — Order state machine
- `.cursor/rules/37-order-payment.mdc`
