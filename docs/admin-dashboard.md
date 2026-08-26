# Admin Dashboard and Dynamic CMS

## 1. Purpose

The Admin Dashboard is the internal operational interface for managing the
multi-vendor, multi-store ecommerce platform. It is a presentation and
operations layer, not a second backend.

Delivery is sliced in [`docs/PHASES.md`](PHASES.md) Phase 20.1–20.8. **Phase 20.1**
ships the admin shell, granular permissions, Settings/Media/Audit foundations,
and Vendor/Store admin list/detail read APIs. **Phase 20.2** adds admin detail
UIs for vendor/store lifecycle and staff over existing `/vendors/:id/*` and
`/stores/:id/*` mutation routes (no parallel admin mutation controllers).
**Phase 20.4 (partial)** adds COD settings forms on vendor/store detail (same
`PATCH …/settings` routes) plus a thin `/admin/system/commerce` hub; shipping
courier and tax/commission admin remain open (no public courier API / engines later).
**Phase 20.3.1** ships a Website Control Center _skeleton_: public
`GET /storefront/config`, admin `/admin/system/website` for platform general +
branding (Settings only). CMS page builder, menus, draft→publish, and Redis config
cache remain deferred until Media + CMS exist.
**Phase 20.6** adds platform ops list pages (`/admin/orders`, `/payments`,
`/inventory`, `/users`) over thin module list APIs (no admin BFF business rules).
**Phase 20.7** adds `/admin/system/security` over `GET /admin/audit/events`
(login history + `auth.*` security events); identity appends via `AUDIT_PORT`.

The frontend displays backend-owned state and invokes typed APIs. Business
rules, authorization, transactions, validation, publishing, and audit behavior
remain in backend bounded contexts.

The dashboard must support:

- Store and vendor management
- Catalog, variants, and inventory
- Orders, customers, payments, refunds, and returns
- Promotions and coupons
- CMS and media
- Reports and analytics
- Notifications and support
- POS operations
- Audit, activity, monitoring, and settings

## 2. Architecture

Use Next.js App Router, TypeScript, and Tailwind CSS.

Prefer Server Components for read-only route composition and Client
Components only for interaction. Use feature-level API services and strongly
typed contracts. Do not import backend domain classes into the frontend or
access the database from the browser.

Recommended frontend structure:

```text
frontend/src/
  app/
    (admin)/
      admin/                 # URL prefix /admin/*
        dashboard/
        vendors/
        stores/
        system/health/
        system/marketing/
        system/commerce/   # Phase 20.4 COD hub → vendor/store detail
        ...
    login/
  features/
    dashboard/
    ...
```

Phase 20.1 lives under `app/(admin)/admin/`. Later slices add commerce/content
routes from the checklist in `docs/PHASES.md` without inventing a parallel admin
backend.
Backend ownership remains separated across Identity/RBAC, Vendor, Store,
Catalog, Inventory, Order, Payment, CMS/Content, Media, Settings/Branding,
Reporting, Audit, and POS contexts.

## 3. Personas and Scope

Supported roles include:

```text
SUPER_ADMIN
ADMIN
CATALOG_MANAGER
INVENTORY_MANAGER
ORDER_MANAGER
FINANCE_MANAGER
MARKETING_MANAGER
SUPPORT_AGENT
POS_MANAGER
ANALYST
CONTENT_MANAGER
DEVELOPER
```

Every role receives granular permissions such as:

```text
content.page.read
content.page.update
content.page.publish
content.menu.manage
media.asset.upload
settings.branding.update
report.export
pos.cash.adjust
```

Every request resolves scope from the authenticated principal and authorized
resources. The browser must not be trusted for `tenantId`, `vendorId`, or
`storeId` ownership.

Supported scopes:

```text
Platform -> Vendor -> Store
```

A user may switch between authorized vendor and store scopes. The active scope
must be visible in the shell and enforced by the backend. Hiding a navigation
item is not authorization.

## 4. Route and Navigation Contract

The admin route groups are:

```text
/dashboard
/commerce/orders
/commerce/customers
/commerce/payments
/commerce/refunds
/commerce/returns
/catalog/products
/catalog/categories
/catalog/brands
/catalog/attributes
/catalog/import-export
/inventory/overview
/inventory/stock
/inventory/warehouses
/inventory/transfers
/inventory/adjustments
/marketing/promotions
/marketing/coupons
/marketing/settings
/marketing/events
/content/pages
/content/blocks
/content/media
/content/menus
/content/branding
/reports/sales
/reports/orders
/reports/products
/reports/customers
/reports/inventory
/reports/payments
/reports/pos
/analytics
/pos/registers
/pos/drawers
/pos/shifts
/pos/reconciliation
/support/tickets
/system/notifications
/system/activity
/system/audit
/system/jobs
/system/health
/settings/store
/settings/users
/settings/roles
/settings/payments
/settings/tax
/settings/localization
/settings/pos
```

Navigation must be permission-aware and support nested groups, active states,
keyboard navigation, breadcrumbs, responsive behavior, and a global command
palette. Route search, filters, pagination, tabs, date ranges, and selected
views should use URL state where sharing or browser navigation is useful.

## 5. Dashboard Home

The home page should provide a focused operational overview:

- Revenue and order KPIs with comparison periods
- Revenue trend
- Order and payment status
- Top products
- Low-stock alerts
- Refund summary
- Recent orders and customers
- System alerts and pending tasks

Widgets must use feature-level read APIs and remain independently loadable.
One failed analytics widget must not crash the entire dashboard.

## 6. Common UI Requirements

Reusable primitives should include buttons, inputs, selects, comboboxes,
date pickers, dialogs, drawers, tabs, badges, tables, pagination, tooltips,
toasts, alerts, skeletons, breadcrumbs, and command menus.

Every asynchronous view requires loading, empty, error, and disabled-action
states. Major lists require search, filters, sorting, pagination, column
visibility, bulk selection, export, and responsive behavior where applicable.

Use semantic HTML, visible focus states, labels, keyboard navigation, screen
reader support, sufficient contrast, and reduced-motion behavior. Do not use
color as the only status indicator.

Financial values, tax, discounts, refunds, payment amounts, inventory
quantities, and authoritative totals come from the backend. The frontend must
not use floating-point calculations for financial decisions.

## 7. CMS Ownership and Resources

The CMS/Content context owns:

- Pages
- Content blocks
- Banners
- Menus and navigation items
- SEO metadata
- Redirects
- Publication records
- Draft versions

The Media context owns uploaded files, metadata, variants, storage references,
access rules, and lifecycle state. Product, order, payment, and inventory data
remain owned by their respective contexts and are referenced through stable
IDs or published contracts.

Content resources should support title, slug, locale, status, version, SEO
metadata, author, timestamps, scope, and publication history. CMS content must
not directly mutate operational data.

## 8. Dynamic Branding

Branding is inherited by specificity:

```text
Global defaults -> Vendor override -> Store override
```

The most specific configured value wins. An unset store value inherits from the
vendor, and an unset vendor value inherits from the global configuration.

A branding configuration may contain:

- Display name
- Slogan or tagline
- Logo media ID
- Alternate/light logo media ID
- Favicon media ID
- Theme color tokens
- Typography configuration where supported
- Locale
- Timezone
- Currency display configuration
- Social and metadata defaults

The effective branding endpoint must return resolved values plus their source
scope so the admin UI can explain inheritance. Saving an override must not
copy unrelated inherited values into the child scope.

The favicon field accepts a managed media reference whose validated asset is an
ICO file or an explicitly supported favicon format. The frontend must render
the effective favicon from the media service, with a configured platform
fallback when no scoped favicon exists. Logo and favicon URLs must not be the
source of truth in frontend code.

## 9. Media Management

Media uploads must use the Media API and stable media IDs. The backend must:

- Validate file signature and declared MIME type
- Enforce file size and image dimension limits
- Validate ICO structure and supported image formats
- Scan or quarantine uploads according to deployment policy
- Reject unsafe or unsupported SVG content
- Generate optimized variants where applicable
- Enforce tenant/vendor/store access
- Preserve metadata and replacement history
- Avoid exposing storage credentials or private object paths

The CMS should provide upload, preview, search, filtering, replacement, archive,
and authorized deletion. Removing a media reference must not silently delete a
file still referenced by published content.

## 10. Menus and Navigation

Menus are scoped resources with optional global, vendor, and store versions.
They support:

- Nested parent and child items
- Explicit ordering
- Labels and locale variants
- Icons or media references
- Internal routes
- Product, category, and CMS page destinations
- Validated external URLs
- Visibility and scheduling
- Permission-aware display

The backend must validate that menu trees contain no cycles, duplicate sibling
ordering, invalid parent references, malformed URLs, or inaccessible internal
destinations. A published menu must resolve against the active store and user
permissions without allowing the frontend to authorize access.

## 11. Draft, Preview, and Publishing

Branding, pages, blocks, banners, and menus use this lifecycle:

```text
DRAFT -> PREVIEW -> PUBLISHED
                  -> SCHEDULED -> PUBLISHED
PUBLISHED -> UNPUBLISHED
PUBLISHED -> ROLLED_BACK
```

Editing saves a draft and does not change live content. Preview uses a secure,
scoped preview token and never exposes unpublished content through normal
public endpoints. Publishing must:

- Validate the complete resource and referenced media
- Check scope and permission
- Check the expected version for optimistic concurrency
- Create immutable publication history
- Emit a publication event
- Invalidate relevant caches
- Record actor, scope, reason, and before/after references in the audit log

Rollback creates a new publication from a previous valid version; it does not
delete history. Scheduling must use the configured store timezone and UTC
persistence.

## 12. CMS API and Application Contracts

The frontend communicates through typed APIs such as:

```text
GET    /api/v1/admin/branding/effective
PATCH  /api/v1/admin/branding/overrides
POST   /api/v1/admin/media
GET    /api/v1/admin/media
POST   /api/v1/admin/content/pages
PATCH  /api/v1/admin/content/pages/:id
POST   /api/v1/admin/content/pages/:id/preview
POST   /api/v1/admin/content/pages/:id/publish
POST   /api/v1/admin/content/pages/:id/unpublish
POST   /api/v1/admin/content/pages/:id/rollback
POST   /api/v1/admin/content/menus
PATCH  /api/v1/admin/content/menus/:id
POST   /api/v1/admin/content/menus/:id/reorder
POST   /api/v1/admin/content/menus/:id/publish
```

Equivalent application commands include `UpdateBrandingOverride`,
`UploadMedia`, `CreatePage`, `UpdatePage`, `CreateMenu`, `ReorderMenuItems`,
`PreviewDraft`, `PublishContent`, `SchedulePublication`, `UnpublishContent`,
and `RollbackPublication`.

All commands enforce authorization and server-derived scope. Commands that may
be retried require idempotency keys. Validation errors use the platform's
standard problem-details format.

## 13. Audit and Security

Audit events are required for:

- Branding changes
- Logo and favicon changes
- Media upload, replacement, archive, and deletion
- Menu changes and reordering
- Page and content changes
- Preview and publication
- Scheduling and rollback
- Permission and role changes

Audit records include actor, action, resource, scope, timestamp, request ID,
and safe before/after metadata. Never record passwords, tokens, storage
credentials, or unnecessary personal data.

Use PostgreSQL constraints, row-level security, optimistic concurrency, short
transactions, outbox events, and cache invalidation. Reporting and activity
feeds are read models and must not become alternate sources of truth.

## 14. Reports, POS, and Financial UI

Reports are organized by sales, orders, products, customers, inventory,
payments, marketing, tax, shipping, and POS. Expensive reports and exports use
read models and background jobs.

The POS admin area includes registers, drawers, shifts, sales, returns, refunds,
deposits, reconciliation, and end-of-day reports. POS reports must distinguish
completed sales from physical cash, including cash sales, non-cash sales,
refunds, bank deposits, expected cash, actual cash, variance, and carry-forward
balance. Opening-balance loss adjustments remain audited and historical closes
remain immutable.

Currency and timezone formatting are configuration-driven. Store timezone is
used for date ranges and scheduling; backend timestamps remain UTC.

## 15. Implementation Sequence

The admin dashboard depends on the following contracts:

```text
Foundation
-> Identity and authentication
-> RBAC and tenant/vendor/store authorization
-> Persistence, media storage, and audit
-> Vendor and store management
-> CMS, Settings/Branding, and publication contracts
-> Admin shell and typed API client
-> Domain feature screens
-> Reporting read models and exports
```

Use feature flags for incomplete or risky features. Do not expose a UI action
until its backend permission, validation, transaction, audit behavior, and
failure state exist.

## 16. Definition of Done

An admin feature is complete when:

- The route and responsive UI are implemented
- Loading, empty, error, and success states exist
- Backend API and validation are integrated
- Permissions are enforced by the backend and reflected in the UI
- Sensitive operations have confirmation and audit behavior
- URL state is used for shareable list state where appropriate
- Accessibility and keyboard behavior are tested
- Unit, component, integration, and critical E2E tests exist
- Published content and effective branding are verified at the correct scope
- Rollback and failure behavior are defined for mutable operational workflows
