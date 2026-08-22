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

## Testing requirements

- Lifecycle transitions valid and invalid
- Vendor A cannot read or mutate Vendor B
- Staff permission boundaries
- Admin-only approval paths

## Exit criteria

- Vendor aggregate, lifecycle, and staff model implemented
- Authorization integrated with Identity roles
- Events emitted through outbox for downstream modules

## Related

- [PHASES.md](../PHASES.md) — Phase 03
- [Store Module](./store.md)
- `.cursor/rules/34-vendor-store.mdc`
