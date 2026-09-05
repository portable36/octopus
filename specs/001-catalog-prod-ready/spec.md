# Feature Specification: Catalog Production Readiness and Hardening

**Feature Branch**: `001-catalog-prod-ready`

**Created**: 2026-09-05

**Status**: Draft

**Input**: User choices from Catalog Production-Readiness Grill:

- Q1 = C (Full module production hardening across P0, P1, and P2 gaps)
- Q2 = A (Strict sellability chain enforced at both Catalog activate and Cart validate)
- Q3 = A (Wire Identity catalog permissions alongside active vendor staff tenant verification)
- Q4 = A (Defer separate Brand aggregate & dynamic AttributeDefinition engine as documented debt)
- Q5 = A (Deliver using Spec Kit workflow)

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Multi-Point Sellability Validation (Priority: P1)

Merchants and store operators can only offer items for sale that are legitimately ready to sell. Customers must never be allowed to add to cart or purchase draft products, archived variants, or unapproved offers.

**Why this priority**: Directly protects financial and transactional integrity. Selling unready or inactive products creates fulfillment failures, customer dissatisfaction, and payment reconciliation issues.

**Independent Test**:

1. Attempting to activate a Store Offer whose parent Product is unpublished or whose Variant is DRAFT fails with a business validation error.
2. In the Cart module, adding a line item for an offer whose Product is subsequently unpublished or Variant deactivated fails re-validation during cart recalculation.

**Acceptance Scenarios**:

1. **Given** a Product in DRAFT or PENDING_REVIEW status and a Variant in ACTIVE status, **When** a merchant attempts to activate a Store Offer for this variant, **Then** the system rejects the activation with a 400 Bad Request indicating the product must be published.
2. **Given** a published Product and a Variant in DRAFT status, **When** a merchant attempts to activate a Store Offer for this variant, **Then** the system rejects the activation indicating the variant must be active.
3. **Given** an existing active Store Offer, **When** a customer attempts to add the offer to their cart, **Then** the system verifies the full sellability chain (Product is published, Variant is ACTIVE, Store Offer is active) before creating or updating the cart line.
4. **Given** items in a customer cart, **When** the underlying product is unpublished before checkout, **Then** cart recalculation/validation marks the line item as invalid and prevents checkout.

---

### User Story 2 - Fine-Grained Catalog Authorization & Tenant Scoping (Priority: P1)

Platform administrators, vendor staff, and store operators have clearly bounded access to catalog resources based on their assigned Identity permissions (`catalog.product.read`, `catalog.product.create`, `catalog.product.update`) and vendor organization scope.

**Why this priority**: Eliminates security privilege escalation where any staff member could previously perform destructive lifecycle operations, and prevents customer tokens from accessing merchant authoring APIs.

**Independent Test**:
Can be verified with automated HTTP integration tests verifying that callers without `catalog.product.create` or `catalog.product.update` receive 403 Forbidden, while authorized vendor staff succeed within their own vendor boundary only.

**Acceptance Scenarios**:

1. **Given** an authenticated user who belongs to Vendor A's staff but lacks the `catalog.product.update` permission, **When** they attempt to update a product or publish a product, **Then** the request is rejected with 403 Forbidden.
2. **Given** an authenticated user with `catalog.product.update` for Vendor A, **When** they attempt to update or publish a product owned by Vendor B, **Then** the request is rejected with 403 Forbidden.
3. **Given** an authenticated customer token, **When** they attempt to call merchant authoring endpoints (`POST /api/v1/products`, `PATCH /api/v1/products/:id`, etc.), **Then** the system fails closed with 403 Forbidden.
4. **Given** a Platform Administrator with `platform.admin` authority, **When** they perform administrative operations or view vendor catalogs, **Then** the operation is authorized and audited.

---

### User Story 3 - Barcode & Identifier Uniqueness Guarantee (Priority: P1)

Merchants and inventory/POS operators require deterministic, collision-free product identifiers (SKUs, Barcodes, GTINs, EANs, UPCs). The system must enforce uniqueness and valid checksums on standard barcode formats.

**Why this priority**: Barcode collisions in a multi-vendor catalog break barcode scanner workflows in Point-of-Sale (POS) and warehouse logistics, leading to wrong item fulfillments.

**Independent Test**:
Can be tested by attempting to register a variant with an existing barcode or invalid GTIN checksum; the system rejects duplicates with a clear conflict error.

**Acceptance Scenarios**:

1. **Given** a variant with barcode "012345678905" registered for Vendor A, **When** another variant is created with the exact same barcode within the same uniqueness scope, **Then** the system rejects the creation with a 409 Conflict.
2. **Given** a barcode value with invalid checksum formatting, **When** submitting the variant, **Then** the system validates the format and rejects malformed values.
3. **Given** an existing variant, **When** its SKU or barcode is queried via identifier lookup ports, **Then** the system returns the exact matching variant ID and parent product ID.

---

### User Story 4 - Hardened Public Storefront Read Models (Priority: P2)

Public catalog endpoints must expose only customer-safe, published, and active catalog entities. Internal merchant details (such as cost prices, internal supplier notes, or draft variants) must never leak into public responses.

**Why this priority**: Protects commercial confidentiality and ensures storefront buyers only see purchase-ready options.

**Independent Test**:
Can be tested by querying public product endpoints (`GET /api/v1/public/products/:id`) for a product with 2 active variants and 1 draft variant, ensuring only active variants and public pricing are returned.

**Acceptance Scenarios**:

1. **Given** a published product having two ACTIVE variants and one DRAFT variant, **When** a buyer requests `GET /api/v1/public/products/:id`, **Then** the response contains only the two ACTIVE variants.
2. **Given** a published product, **When** viewed on the public storefront, **Then** cost prices and internal vendor fields are omitted from the serialized payload.
3. **Given** an unpublished (DRAFT, PENDING_REVIEW, or ARCHIVED) product, **When** queried through public endpoints, **Then** the system returns 404 Not Found.

---

### User Story 5 - Category Hierarchy Operations & Search Outbox Events (Priority: P2)

Platform administrators can manage the category taxonomy (rename, move categories in the hierarchy, update SEO metadata) with cycle prevention, while all category changes reliably emit transactional outbox events to keep downstream search indices synchronized.

**Why this priority**: Categories drive the storefront navigation and search discovery. Missing outbox events leave Meilisearch and navigation filters out of sync.

**Independent Test**:
Can be tested by moving a category to a new parent, verifying cycle rejection if moved under its own descendant, and verifying a corresponding event is written to `catalog_outbox`.

**Acceptance Scenarios**:

1. **Given** Category A with child Category B, **When** an administrator attempts to move Category A under Category B, **Then** the system rejects the operation to prevent hierarchy cycles.
2. **Given** valid category updates (rename, move, SEO update), **When** persisted, **Then** the system appends a domain event to the `catalog_outbox` table in the same database transaction.
3. **Given** the authoring categories endpoint `GET /api/v1/categories`, **When** called, **Then** access is properly authenticated and scoped.

---

### User Story 6 - Physical Attributes Persistence (Weight & Dimensions) (Priority: P2)

Variant physical attributes (weight in grams/kg and dimensions length x width x height with units) are fully persisted to the database and included in variant contracts for accurate logistics and shipping calculations.

**Why this priority**: Shipping rate calculators, parcel parceling, and carrier integrations rely on accurate weight and volumetric dimensions.

**Independent Test**:
Can be tested by creating or updating a variant with weight 750g and dimensions 15x20x5 cm, and verifying persistence in database queries and API responses.

**Acceptance Scenarios**:

1. **Given** variant data with weight and dimensions, **When** the variant is saved, **Then** the values are persisted in the `catalog_variants` table.
2. **Given** a saved variant with physical specifications, **When** retrieved through catalog access ports, **Then** the dimensions and weight value objects are accurately reconstructed.

---

## Edge Cases

- **Concurrent Sellability Mutations**: What happens when an offer is added to a cart at the exact moment the product is unpublished? Cart validation during checkout re-verifies the sellability chain and rejects checkout if invalid.
- **Product with Zero Active Variants**: When a merchant attempts to publish a product with no variants or only draft variants, publication is rejected until at least one sellable variant is active.
- **Primary Image Resolution**: If product media is updated and the primary thumbnail is removed, the domain service deterministically falls back to the first available media item.
- **Category Archival with Active Products**: Archiving a category warns or handles products assigned to it without breaking product navigation.
- **SKU Case-Insensitivity & Normalization**: SKUs are trimmed and compared case-insensitively to prevent duplicate SKUs differing only by casing (e.g. `ABC-123` vs `abc-123`).

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST verify the full sellability chain (Product is `published`, Variant is `ACTIVE`, StoreOffer is `active`) when activating a Store Offer.
- **FR-002**: Cart module validation port MUST verify that line item offers belong to a `published` product and `ACTIVE` variant in addition to an `active` store offer.
- **FR-003**: System MUST prevent publishing a Product that has zero ACTIVE variants.
- **FR-004**: System MUST check caller permissions (`catalog.product.create`, `catalog.product.update`, `catalog.product.read`) in `CatalogAuthorizationService` alongside active vendor staff validation.
- **FR-005**: Merchant authoring endpoints MUST reject requests from plain customer accounts and cross-vendor actors with 403 Forbidden.
- **FR-006**: System MUST enforce uniqueness of barcodes across the designated uniqueness scope and validate standard GTIN/UPC/EAN checksums where provided.
- **FR-007**: System MUST provide database column persistence and mapping for variant physical dimensions and weight.
- **FR-008**: Public catalog queries MUST filter out non-active variants, returning only ACTIVE variants for published products.
- **FR-009**: Public DTOs MUST exclude cost price, internal vendor notes, and private metadata.
- **FR-010**: System MUST expose administrative HTTP endpoints for category hierarchy management (rename, move, update SEO) with cycle detection.
- **FR-011**: Category creation, update, and archival operations MUST emit domain events to `catalog_outbox` within the persistence transaction.
- **FR-012**: System MUST include a comprehensive suite of negative authorization, sellability, and identifier collision tests.

### Key Entities

- **Product**: Owns product identity, vendor ownership, lifecycle status (`draft`, `pending_review`, `published`, `archived`), description, media references, and SEO tags.
- **Variant**: Represents a concrete sellable unit belonging to a Product; has an immutable canonical internal Variant ID, unique SKU, optional barcode/GTIN, physical dimensions, weight, and pricing metadata. Status is `DRAFT`, `ACTIVE`, or `ARCHIVED`.
- **StoreOffer**: Links a Variant to a specific Store with store-specific retail pricing and status (`draft`, `active`, `suspended`).
- **Category**: Hierarchical classification tree with parent-child links, slug, display order, and SEO metadata.
- **CatalogOutbox**: Transactional outbox table storing catalog change events for asynchronous search indexing and projection updates.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of checkout and cart submission paths reject offers associated with unpublished products or non-active variants.
- **SC-002**: Automated test suite covers negative authorization tests across all catalog mutation endpoints with 0 unauthorized leaks.
- **SC-003**: Duplicate barcode creation attempts within the same scope are blocked with 100% consistency at both application and database levels.
- **SC-004**: Public product responses return 0 draft variants and 0 cost price fields.
- **SC-005**: All catalog and category mutations write outbox events atomically; 0 orphaned catalog mutations without outbox entries.
- **SC-006**: Complete backend test suite passes with zero regressions in existing store, inventory, or cart workflows.

---

## Assumptions

- Brand entity is modeled as a verified stable reference (`brandId`) rather than a dedicated new bounded context for this pass, per grill decision Q4 = A.
- Dynamic custom attribute definition schemas (AttributeDefinition / AttributeGroup engine) remain deferred; variant attributes continue to use typed normalized JSON pairs per Q4 = A.
- POS and inventory systems reference canonical Variant IDs and rely on the catalog module's barcode lookup ports.
