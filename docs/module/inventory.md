# Inventory Module

## Responsibility

The Inventory bounded context owns stock quantities, reservations, warehouses, adjustments, transfers, and availability truth used by Cart, Checkout, Order, POS, and Fulfillment.

Inventory owns:

- Inventory item records keyed by variant and warehouse/store scope
- On-hand, reserved, **unsellable on-hand** (return quarantine), and available quantity projections
- Stock receive, adjustment, transfer, and **return restore** commands
- Reservation lifecycle: create, commit, release, expire
- Low-stock thresholds and alerts (as events, not silent UI state)

Inventory does not own:

- Product or variant catalog metadata (Catalog module)
- Final customer pricing (Pricing module)
- Order payment or fulfillment shipment records

## Concurrency model

Inventory correctness is database-backed:

```text
BEGIN
  lock inventory row / optimistic version check
  verify available >= requested
  create or update reservation
  (checkout passes method-aware expiresAt — COD uses longer TTL, default 72h)
  adjust reserved/available atomically
  insert outbox event
COMMIT
```

Redis may coordinate contention but must never be the sole source of truth.

## Operations

- `receiveStock` — increase on-hand
- `adjustStock` — audited correction with reason
- `transferStock` — move between warehouses
- `reserveStock` — hold quantity for checkout/order
- `releaseReservation` — rollback hold
- `commitReservation` — convert hold to deduction on fulfillment/payment success
- `expireReservations` — background job for stale holds
- `restoreFromReturn` — after return inspection accept: sellable restock or unsellable quarantine (Phase 14.3)

## Events

```text
InventoryAdjusted
InventoryReserved
InventoryReleased
InventoryCommitted
InventoryDepleted
ReservationExpired
```

## Public contracts

```ts
interface InventoryPort {
  checkAvailability(input: AvailabilityQuery): Promise<AvailabilityResult>;
  reserve(input: ReserveInventoryInput): Promise<ReservationResult>;
  release(input: ReleaseInventoryInput): Promise<void>;
  commit(input: CommitInventoryInput): Promise<void>;
  restoreFromReturn(input: RestoreFromReturnInput): Promise<RestoreFromReturnResult>;
}
```

POS, Checkout, Order, and Returns call the port; they do not query inventory tables directly.

## Testing requirements

- Concurrent reservation without overselling
- Reservation expiry restores availability
- Wrong vendor/store isolation
- Idempotent reserve/commit/release with command IDs
- Integration tests with real PostgreSQL locking

## Exit criteria

- Reservation flow integrated with Checkout and Order
- Overselling prevented by constraints and tests
- `npm.cmd run validate` passes

## Vendor portal

Phase 19.2 store-scoped inventory UI (`/vendor/[vendorId]/inventory`) calls the
existing store inventory HTTP endpoints; no parallel stock UI truth.

## Related

- [PHASES.md](../PHASES.md) — Phase 06; Phase 19.2 Vendor Portal Inventory
- [ARCHITECTURE.md](../../ARCHITECTURE.md) — Inventory section
- `.cursor/rules/35-inventory.mdc`
