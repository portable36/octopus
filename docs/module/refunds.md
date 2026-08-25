# Refunds Module

## Responsibility

Owns **return requests** (Phase 14.1). Coordinates refunds and inventory via ports — does not own provider APIs, ledger posting, or stock tables.

**Payment-owned refunds** live in the Payment module (Phase 14.2): `POST /api/v1/payments/:paymentIntentId/refunds` with `payment.refund.create`.

## Separation

```text
Return → (later) PaymentPort.createRefund / InventoryPort.restockFromReturn / LedgerPort
```

Do not refund or restock when a customer only submits a request.

## Inventory restore (14.3)

After `INSPECTION_APPROVED` with `quantityAccepted > 0`, Returns calls `InventoryPort.restoreFromReturn`:

- Condition `NEW` / `LIKE_NEW` / `USED` → sellable `onHand` (`RESTOCK`)
- Other conditions → `unsellableOnHand` quarantine (`RETURN_UNSELLABLE`) — does not increase available
- Idempotent key `return-restore:{returnId}`; FIFO allocate accepted qty across return lines (warehouse from order line snapshot)

## Return state machine (14.1)

```text
REQUESTED → UNDER_REVIEW → REJECTED | APPROVED
APPROVED → AWAITING_RETURN → RECEIVED → INSPECTING
INSPECTING → INSPECTION_REJECTED | INSPECTION_APPROVED
```

`REFUNDING` / `REFUNDED` reserved for wiring after inspection → Payment refund (optional `returnId` on refund). Terminal: `REJECTED`, `CANCELLED`, `INSPECTION_REJECTED` (+ later `REFUNDED`).

## Payment refunds (14.2)

- Max refundable = captured intent amount − sum(PENDING + SUCCEEDED refunds)
- **COD:** refundable only when `COLLECTED`; method `MANUAL` (cash return recorded — no fake refund while awaiting collection)
- **Gateway:** refused until capture/`SUCCEEDED` ships; `PaymentRefundGateway` stub ready for adapters
- Idempotency via `payment_operations` + outbox `RefundCompleted` (with `allocation` for LedgerPort) for Phase 14.4 / 15

## Rules

- Derive `vendorId` / `storeId` from the order — never from the client
- Refundable money and inventory restoration are **out of scope** for 14.1
- Returnable qty = fulfilled − qty on non-failed returns
- Window default 7 days (fulfillment proxy = order `updatedAt` when `FULFILLED`/`COMPLETED`)
- Integer minor units on line snapshots only (no live catalog price)

## Related

- [PHASES.md](../PHASES.md) — Phase 14.1–14.4
- [Payment](./payment.md) · [Order](./order.md) · [Fulfillment](./fulfillment.md)
