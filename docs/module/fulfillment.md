# Fulfillment Module

## Responsibility

The Fulfillment bounded context owns shipment creation, carrier integration (Steadfast, Pathao, MANUAL), tracking updates, partial fulfillment, delivery confirmation, and return shipment coordination.

Fulfillment owns:

- Shipment aggregate and shipment line items
- Carrier provider metadata and tracking / consignment ids
- Shipment status lifecycle
- Partial fulfillment linkage to order lines
- Delivery confirmation and failure reasons
- Minimal `fulfillment_outbox` rows (Phase 12 dispatcher later)

Fulfillment does not own:

- Order payment state (Order/Payment modules)
- Inventory source truth (Inventory module commits/releases)
- Refund execution (Refunds module / Payment refunds)
- Courier settlement / merchant payout ledgers (Payout)

## Shipment status

```text
PENDING -> PROCESSING -> SHIPPED -> IN_TRANSIT -> OUT_FOR_DELIVERY -> DELIVERED
```

Exception paths include `FAILED` and `RETURNED`. Transitions are explicit domain methods.

## Courier providers

| Provider  | Auth                     | Create                   | Status                                  |
| --------- | ------------------------ | ------------------------ | --------------------------------------- |
| STEADFAST | Api-Key + Secret-Key     | Packzy `/create_order`   | `/status_by_cid\|invoice\|trackingcode` |
| PATHAO    | OAuth password + refresh | `/aladdin/api/v1/orders` | `/orders/{id}/info`                     |
| MANUAL    | none                     | local ids                | staff mark-delivered                    |

Credentials are **per vendor**, AES-GCM encrypted at rest. Env vars supply sandbox defaults only.

Money stays integer minor units internally. Adapters convert BDT `amountMinor / 100` to courier major units. COD collectible amount comes from the Payment intent; prepaid orders send `0`.

## COD handoff

```text
sync-status / mark-delivered → DELIVERED
→ PaymentPort.confirmCodCollectionFromFulfillment (exact amount)
→ Order.markPaidFromPayment
```

Storefront never marks paid. Partial-delivered / cancelled does not auto-collect.

## HTTP

- `POST /api/v1/fulfillment/shipments`
- `POST /api/v1/fulfillment/shipments/:id/sync-status`
- `POST /api/v1/fulfillment/shipments/:id/mark-delivered` (MANUAL)

## Testing requirements

- Partial fulfillment quantity math (order port)
- Invalid transitions rejected
- Vendor/store staff authorization
- Status mappers (Steadfast / Pathao)
- Amount conversion COD vs prepaid
- DELIVERED sync triggers trusted COD collect once

## Exit criteria

- [x] Shipment aggregate integrated with Order via ports
- [x] Carrier adapters behind `CourierPort`
- [ ] Return shipment workflows (Phase 14)
- [ ] Background status poller (Phase 12)

## Related

- [PHASES.md](../PHASES.md) — Phase 13
- [Order Module](./order.md)
- [Payment Module](./payment.md)
- [Refunds Module](./refunds.md)
