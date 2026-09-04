# Store Module

## Responsibility

The Store bounded context owns store identity, store settings, store lifecycle, and store staff assignments under a vendor.

Store owns:

- Store aggregate root and Store ID
- Vendor ownership reference
- Store slug, display name, and public profile metadata
- Timezone, default currency, and locale settings
- Physical address and contact channels where applicable
- Store status lifecycle
- Store staff assignments and store-scoped permissions

Store does not own:

- Vendor legal entity profile (Vendor module)
- Product definitions (Catalog module)
- Store Offer, price, or inventory truth (Catalog offer layer, Pricing, Inventory)
- Order fulfillment execution (Fulfillment module)

## Lifecycle

```text
DRAFT -> PROVISIONING -> ACTIVE
PROVISIONING -> FAILED (retry)
ACTIVE -> SUSPENDED | MAINTENANCE
ACTIVE -> ARCHIVED (CLOSED deprecated alias)
```

Vendor onboarding wizard and provisioning saga: see [store-provisioning.md](./store-provisioning.md).

## Admin Store Management (Phase A)

Platform admin surfaces under `/admin/stores` reuse the same Store aggregate, lifecycle handlers, and draft → submit → provisioning flow as vendor (no second creation stack).

| Surface                        | API                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------- |
| Paginated list + search/filter | `GET /admin/stores?q=&status=&vendorId=&storeType=&country=&page=&limit=&sort=` |
| Status cards                   | `GET /admin/stores/stats` (`GROUP BY status`)                                   |
| Detail                         | `GET /admin/stores/:storeId`                                                    |
| Overview + health              | `GET /admin/stores/:storeId/overview` (+ `/health`)                             |
| Lifecycle                      | `POST /admin/stores/:storeId/activate\|suspend\|maintenance\|archive`           |
| Provisioning                   | `GET/POST /admin/stores/:storeId/provisioning[/retry]`                          |

Permissions: `platform.stores.read` (list/overview), `platform.stores.write` (lifecycle + provisioning retry). Vendor routes under `/stores/...` remain for vendor staff.

Health checks (cheap): lifecycle status, `store_domains` present/verified, warehouse row, POS receipt template, store settings document. Order/revenue metrics return `available: false` until reporting projections exist.

**Deferred (remaining Phase B tabs):** payments config, shipping/tax, branding/SEO, notifications, analytics/GEM, full activity, domains CRUD, store groups, import/export.

**Phase B shipped so far:** Store Details tabs for Catalog (store offers read), Inventory (warehouses + stock), Orders (store-scoped list), POS (receipt template + register placeholder).

## Store offers

Catalog products are vendor-owned. A store publishes an **offer** that binds catalog references to store-specific price, availability policy, and merchandising. Never mutate another store's offer through a shared product row.

```text
Product (vendor) -> Store Offer (store) -> Price / Inventory / Availability
```

## Architecture

Module path: `backend/src/modules/store/`. Store mutations require validated `vendorId` from tenant context, not from the request body alone.

## Events

```text
StoreCreated
StoreActivated
StoreSuspended
StoreClosed
StoreStaffAssigned
StoreStaffRemoved
```

## Testing requirements

- Store ownership under vendor
- Slug uniqueness within documented scope
- Staff cannot operate outside assigned store
- Suspended/closed store blocks new checkout for that store
- Admin list pagination/filter + stats; non-platform denied on admin overview
- Health score WARNING/CRITICAL from failed cheap checks

## Exit criteria

- Store aggregate and lifecycle implemented
- Store staff authorization wired to Identity
- Store Offer contract documented with Catalog and Pricing
- Admin Phase A list/details/create-reuse shipped

## Related

- [PHASES.md](../PHASES.md) — Phase 04 / Phase 20.2
- [Vendor Module](./vendor.md)
- [Catalog Module](./catalog.md)
- `.cursor/rules/34-vendor-store.mdc`
