# Multi-Vendor

## Concept

A **vendor** is an independent merchant on the platform with its own staff, catalog ownership, stores, orders, inventory policy, and financial ledger. Platform administrators govern onboarding and suspension; vendors operate within assigned scope.

## Hierarchy

```text
Platform
  └── Vendor
       ├── Vendor users (roles)
       ├── Stores
       ├── Catalog (vendor-owned products)
       ├── Orders (vendor-scoped sub-orders where required)
       └── Ledger / payouts
```

## Isolation rules

- Vendor A must never read or mutate Vendor B data through normal application paths
- Authorization checks use server-derived `vendorId`, not client-supplied IDs
- Cross-vendor carts are allowed; cross-vendor aggregate mutation is not

## Module ownership

| Concern          | Owner          |
| ---------------- | -------------- |
| Vendor lifecycle | Vendor module  |
| Vendor staff     | Vendor module  |
| Products         | Catalog module |
| Vendor balance   | Payout module  |

## Related

- [Vendor Module](../module/vendor.md)
- [PHASES.md](../PHASES.md) — Phase 03
- `.cursor/rules/03-tenant-security.mdc`
