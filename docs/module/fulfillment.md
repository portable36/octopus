# Fulfillment Module

## Responsibility

The Fulfillment bounded context owns shipment creation, carrier integration, tracking updates, partial fulfillment, delivery confirmation, and return shipment coordination.

Fulfillment owns:

- Shipment aggregate and shipment line items
- Carrier and tracking number metadata
- Shipment status lifecycle
- Partial fulfillment linkage to order lines
- Delivery confirmation and failure reasons

Fulfillment does not own:

- Order payment state (Order/Payment modules)
- Inventory source truth (Inventory module commits/releases)
- Refund execution (Refunds module / Payment refunds)

## Shipment status

```text
PENDING -> PROCESSING -> SHIPPED -> IN_TRANSIT -> OUT_FOR_DELIVERY -> DELIVERED
```

Exception paths include `FAILED` and `RETURNED`. Transitions are explicit domain methods.

## Operations

- Create shipment from fulfillable order lines
- Record carrier handoff and tracking
- Confirm delivery or delivery failure
- Support partial shipments per order line quantities
- Initiate return shipment workflows when returns approved

## Events

```text
ShipmentCreated
ShipmentShipped
ShipmentDelivered
ShipmentFailed
ReturnShipmentCreated
```

Downstream Notification and Customer Experience modules consume outbox events.

## Testing requirements

- Partial fulfillment quantity math
- Invalid transitions rejected
- Vendor/store staff authorization
- Idempotent tracking update webhooks from carriers

## Exit criteria

- Shipment aggregate integrated with Order status updates
- Partial fulfillment tested
- Carrier adapter behind port where external APIs used

## Related

- [PHASES.md](../PHASES.md) — Phase 13
- [Order Module](./order.md)
- [Refunds Module](./refunds.md)
