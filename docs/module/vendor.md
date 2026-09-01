# Vendor Module

## Responsibility

The Vendor bounded context owns vendor onboarding, vendor profile, vendor lifecycle, vendor staff membership, and vendor-scoped settings.

Vendor owns:

- Vendor aggregate root and Vendor ID
- Business and contact profile data
- Vendor status lifecycle
- Vendor-level settings and feature flags where vendor-scoped
- Vendor staff assignments and vendor-scoped role bindings
- Vendor approval/rejection audit metadata

Vendor does not own:

- Store operating configuration (Store module)
- Product catalog (Catalog module)
- Financial ledger balances (Payout module)
- Payment instruments or settlement execution

## Lifecycle

```text
PENDING -> UNDER_REVIEW -> APPROVED -> ACTIVE -> SUSPENDED
```

Rejection returns to a terminal or rework state documented in application policy. Suspension blocks new commercial activity without deleting historical records.

## Onboarding

Customer vendor applications are available at `/vendor/register` only when the
platform `general.vendorRegistrationEnabled` setting is enabled. Applications
start in `PENDING`, are submitted for review, and require platform approval and
activation before vendor operations become available.

Platform administrators can create a pending vendor for any existing User from
the admin Vendors page. This path is also subject to the same lifecycle and
server-side ownership and membership checks; it does not bypass approval.

## Architecture

Module path: `backend/src/modules/vendor/`. Cross-module access uses application ports and domain events only.

## Key invariants

- Vendor ID is immutable after creation
- Only platform administrators approve or reject pending vendors
- Vendor staff actions are scoped to their vendor ID from server context
- Suspended vendors cannot create stores, publish products, or receive new orders

## Events

```text
VendorCreated
VendorSubmittedForReview
VendorApproved
VendorRejected
VendorActivated
VendorSuspended
```

## Public contracts

- Lookup vendor by ID for authorized actors
- Resolve vendor status for gating checkout and catalog publication
- List vendor staff for admin and vendor-owner portals
- Enforce the platform vendor-registration policy through the shared
  `VENDOR_REGISTRATION_POLICY` port

## Testing requirements

- Lifecycle transitions valid and invalid
- Vendor A cannot read or mutate Vendor B
- Staff permission boundaries
- Admin-only approval paths
- Registration-disabled and admin-created onboarding paths

## Exit criteria

- Vendor aggregate, lifecycle, and staff model implemented
- Authorization integrated with Identity roles
- Events emitted through outbox for downstream modules

## Vendor portal (frontend)

Vendor ops UI lives at `/vendor` (App Router group `(vendor)`). Phase 19.1 ships a
foundation shell over existing vendor/store/order/catalog/finance APIs using
session auth (`authedRequest`) — not admin `?token=`. Phase 19.2 adds store-scoped
inventory at `/vendor/[vendorId]/inventory` over Inventory HTTP APIs. Phase 19.3
adds catalog mutations (product/variant lifecycle + store offer pricing) at
`/vendor/[vendorId]/catalog`. Phase 19.4 deepens orders (status filters, line
fulfill, cancel, shipment create/sync, returns) over existing Order/Fulfillment/
Returns APIs — no admin return approve/reject in vendor UI. Phase 19.5 adds finance
depth (payout request, statements, commission totals) at `/vendor/[vendorId]/finance`.

## Related

- [PHASES.md](../PHASES.md) — Phase 03; Phase 19 Vendor Portal
- [Store Module](./store.md)
- `.cursor/rules/34-vendor-store.mdc`
