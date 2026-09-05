# Store provisioning

## Responsibility

Orchestrates multi-step store onboarding from wizard draft through idempotent module provisioning to `active` status.

## Lifecycle

```text
draft → provisioning → active
provisioning → failed (retry/resume)
active ↔ suspended | maintenance
active → archived (closed is a deprecated alias)
```

## Wizard

Vendor portal: `/vendor/{vendorId}/stores/new` — 17-step draft saved to `store_onboarding_drafts`.

Submit calls `POST /stores/drafts/:id/submit`, creates the store, starts provisioning, redirects to `/vendor/{vendorId}/stores/{storeId}/setup`.

## Provisioning steps (MVP)

1. `StoreIdentityFinalized`
2. `DefaultSettingsProvisioned` (settings module)
3. `CatalogConfigured` (no-op)
4. `WarehouseProvisioned` (inventory — MAIN warehouse)
5. `PosProvisioned` (receipt template)
6. `ProvisioningCompleted`

Each step is recorded in `store_provisioning_steps` with status, timestamps, error, and retry count.

## APIs

| Method    | Path                                  |
| --------- | ------------------------------------- |
| POST      | `/stores/drafts`                      |
| GET/PATCH | `/stores/drafts/:draftId`             |
| POST      | `/stores/drafts/:draftId/validate`    |
| POST      | `/stores/drafts/:draftId/submit`      |
| GET       | `/stores/:storeId/provisioning`       |
| POST      | `/stores/:storeId/provisioning/retry` |

## Events (store outbox)

`StoreCreated`, `StoreProvisioningStarted`, `StoreProvisioningFailed`, `StoreActivated`, `StoreMaintenanceEnabled`, `StoreArchived`, and related profile/settings events.

## Module boundaries

Store aggregate owns identity and lifecycle only. Payment, shipping, tax, branding, SEO, and notifications are written by owning modules via shared-kernel provisioner ports during the saga.

## Related

- [Store module](./store.md)
- `backend/src/modules/store/application/provisioning/`
