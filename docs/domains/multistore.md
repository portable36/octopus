# Multi-Store

## Concept

Each vendor may operate **multiple stores**. A store has its own slug, settings, staff, timezone, currency, and **store offers** that bind vendor catalog products to store-specific price and availability policy.

## Store offer model

```text
Product (vendor catalog)
     ↓
Store Offer (per store)
     ↓
Price / availability / merchandising
```

One vendor product may be offered differently across stores without duplicating catalog identity.

## Isolation rules

- Store staff operate only within assigned stores unless elevated vendor roles apply
- Store suspension blocks new sales for that store only
- Inventory may be warehouse- or store-scoped per documented policy

## Related

- [Store Module](../module/store.md)
- [Catalog Module](../module/catalog.md)
- [PHASES.md](../PHASES.md) — Phase 04
