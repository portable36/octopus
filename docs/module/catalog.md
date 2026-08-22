# Catalog Module

## Responsibility

The Catalog bounded context owns product information and how products are organized, identified, displayed, searched, and published.

Catalog owns:

- Products and product types
- Product variants and variant SKUs
- Brands
- Categories and category hierarchy
- Product, variant, and category attributes
- Attribute groups and allowed attribute values
- Product options and specifications
- Product identifiers, including SKU, barcode, GTIN, UPC, and EAN
- Product media, thumbnails, videos, and media ordering
- Product badges, tags, and relationships
- Related products, cross-sells, and up-sells
- Product bundle metadata
- Product dimensions and weight
- Product status, visibility, publishing, and scheduling
- SEO and search metadata
- Merchandising and sort/ranking configuration
- Product and category localization
- Catalog import/export and bulk operations
- Catalog change history and validation

Catalog does not own:

- Inventory quantities, warehouse stock, or reservations
- Cart state or checkout
- Orders or payments
- Shipping execution
- Customer accounts
- Reviews themselves
- Promotion or coupon execution
- Tax calculation

Other modules may reference Catalog through stable IDs and published application contracts. They must not import Catalog's private domain objects, repositories, persistence models, or infrastructure adapters.

## Architecture

Use Domain-Driven Design, Clean Architecture, SOLID, aggregate-based consistency, repository abstractions, application use cases, domain services, domain events, value objects, and strong typing.

```text
Presentation
		-> Application
		-> Domain

Infrastructure
		-> Application and domain ports
```

Domain code must not depend on NestJS, MikroORM, Prisma, PostgreSQL, Redis, BullMQ, HTTP clients, S3 providers, Meilisearch, or framework decorators. Controllers validate transport input and invoke use cases. Persistence adapters map database records to domain objects.

Avoid business logic in controllers, DTOs, ORM models, generic `utils` modules, or frontend components. Avoid cross-module database coupling, circular dependencies, direct repository access from another module, and anemic models for important catalog behavior.

## Ownership and aggregate boundaries

### Product aggregate

The Product aggregate owns product-level identity and lifecycle:

- product ID
- vendor ownership
- product type
- name and description
- brand reference
- category references
- product status and visibility
- publication schedule
- product-level attributes
- variant references or variant definitions according to the chosen persistence boundary
- media references and thumbnail selection
- SEO and localization metadata
- domain change history events

Product behavior uses intent-revealing methods such as `publish`, `unpublish`, `schedulePublication`, `rename`, `assignBrand`, `addVariant`, `setThumbnail`, and `archive`. Do not expose mutable arrays or arbitrary status setters.

### Variant

A variant represents a sellable catalog configuration such as size, color, material, or capacity. A variant must have:

- immutable Variant ID, which is the canonical internal identifier
- parent Product ID
- non-empty, normalized, unique SKU within the ownership scope
- variant name
- barcode, GTIN, EAN, UPC, MPN, and manufacturer reference where available
- catalog cost price, base price, compare-at price, and explicit currency metadata
- optional weight and dimensions
- variant status and visibility
- zero or more normalized variant attributes
- variant media or a fallback to product media
- tax and shipping classification references
- external references such as ERP, PIM, marketplace, supplier, or POS identifiers
- created and updated UTC timestamps

Variants describe catalog identity and catalog price metadata only. Pricing remains authoritative for final customer prices. Available quantity, reservations, stock movements, order snapshots, fulfillment state, and payment state belong to their owning module contracts.

Inventory, Order, Fulfillment, POS, and integration modules must reference Variant ID as the canonical internal identifier. SKU and barcode are business/external identifiers and lookup inputs, not primary keys.

### Brand

Brand is a Catalog concept containing:

- brand ID
- normalized name
- display name
- slug
- logo/media reference
- description
- localization and SEO metadata
- active/archived status

Products reference a brand by stable ID. Do not duplicate mutable brand details inside every product aggregate.

### Category

Categories form a validated hierarchy with:

- category ID
- parent category ID or root marker
- normalized name and slug
- display order
- localization and SEO metadata
- visibility and active status

Reject cycles, invalid parent references, duplicate sibling slugs, and deletion of a category that still has protected descendants or assignments. Category hierarchy changes must be audited.

## Identifiers and value objects

### SKU

SKU is a normalized business/external identifier for a product or variant. Variant ID remains the canonical opaque internal identifier. The uniqueness scope must be explicit, normally vendor plus SKU or another documented ownership boundary.

Rules:

- SKU is required, non-empty, and unique for every sellable variant.
- SKU is stable after creation and must not be assumed to be changeable.
- If a SKU change is supported, validate uniqueness, record the change, emit a domain event, and maintain audit history where required.
- Inventory, order, fulfillment, POS, and integration records reference Variant ID rather than using SKU as a foreign key.
- Compare normalized values, not display formatting.
- Never use a product name as a primary identifier.
- Do not generate SKUs from untrusted browser input without server-side validation.
- SKU generation must be deterministic, collision-safe, and covered by concurrency tests.

### Barcode identifiers

Barcode, GTIN, UPC, and EAN are external identifiers and are distinct from SKU. Store the identifier type and normalized value:

```text
identifierType: GTIN | UPC | EAN | BARCODE
value: normalized string
```

Validate allowed length and checksum rules for the identifier type where applicable. Enforce uniqueness within the documented catalog scope. Preserve leading zeroes and never store identifiers as numbers.

Barcode lookup is a Catalog read contract. POS or checkout may call that contract, but must not query Catalog tables directly.

## Attributes and options

Separate definitions from assigned values:

```text
AttributeGroup
	-> AttributeDefinition
			-> AttributeValue

Product / Variant
	-> AttributeAssignment
```

Attribute definitions specify code, label, data type, allowed values, requiredness, filterability, and localization. Assignments contain validated values and their scope. Use typed values rather than unstructured strings for numbers, booleans, measurements, and enumerations.

Variant-defining attributes, such as color and size, must be distinguished from descriptive product attributes. A product cannot contain two variants with the same normalized combination of variant-defining attributes.

Options are customer-selectable catalog configuration metadata. Do not use options to store inventory, final price, tax, or promotion outcomes.

## Media and thumbnail rules

Catalog owns media metadata and ordering, not binary object storage implementation. Store a provider-independent media record containing:

- media ID
- owning product or variant ID
- media type: image, video, or document
- private object key or provider reference
- safe MIME type and file size metadata
- width, height, duration, and checksum where available
- display order
- alt text and localization
- visibility/status
- thumbnail/primary role

Each product must have at most one active primary thumbnail per locale and fallback scope. A variant may have its own primary thumbnail; otherwise the storefront may use the product thumbnail according to the published read contract.

Never trust client filenames, MIME types, object keys, or public URLs. Validate uploads, generate object keys server-side, keep private storage by default, and issue signed URLs through an infrastructure adapter. Do not store image binaries in the domain aggregate.

## Lifecycle and publication

Use explicit transitions such as:

```text
DRAFT -> PENDING_REVIEW -> PUBLISHED -> UNPUBLISHED -> ARCHIVED
```

Scheduling must use UTC instants and an explicit timezone policy for authoring. A product is not sellable merely because it is published: Store Offer, Pricing, Inventory, Promotion, Tax, and authorization policies must also permit it.

Publication and catalog changes emit versioned domain events. Search indexing, media processing, notifications, and analytics consume durable outbox events after the Catalog transaction commits.

## Public contracts

Expose application contracts for:

- product lookup by stable ID
- variant lookup by stable ID
- barcode/SKU lookup
- published product read model
- product availability metadata, without claiming inventory truth
- brand and category lookup

Contracts must return explicit DTOs and stable IDs. They must not expose ORM entities, mutable aggregates, internal storage keys, or private attributes.

## Validation and invariants

- Product and variant names satisfy documented length and normalization rules.
- SKU and external identifiers are normalized and unique within their declared scope.
- Variant attribute combinations are unique per product.
- A product cannot publish without required catalog data and a valid thumbnail/media policy where the channel requires one.
- Category hierarchy cannot contain cycles.
- Attribute assignments match their definitions and allowed value types.
- Media order is deterministic and primary-thumbnail selection is unambiguous.
- Vendor ownership is checked server-side for every mutation.
- Catalog never accepts client-provided inventory, price, tax, payment, or order state as authoritative.

## Testing requirements

At minimum, test:

- product and variant creation, rename, publish, unpublish, archive, and invalid transitions
- SKU normalization, generation, uniqueness, and concurrent collision handling
- barcode/GTIN/UPC/EAN validation, leading zeroes, checksum, lookup, and duplicate rejection
- brand assignment and ownership rules
- category parent/child validation and cycle prevention
- typed attributes, allowed values, required attributes, and duplicate variant combinations
- primary thumbnail selection, ordering, fallback, invalid upload metadata, and media authorization
- vendor isolation and cross-module contract access
- catalog events, outbox behavior, and search projection failure/retry handling

## Exit criteria

Catalog is complete only when:

- Product, Variant, Brand, Category, Identifier, Attribute, and Media contracts are documented and implemented.
- SKU and barcode uniqueness are enforced by both application validation and database constraints.
- Catalog mutations are authorized by server-derived vendor/store scope.
- No Catalog code owns inventory, pricing, promotion, tax, order, payment, or review execution.
- Public DTOs and lookup contracts are covered by API and negative authorization tests.
- Persistence migrations, indexes, constraints, and upgrade behavior are verified.
- Domain, application, integration, API, and relevant E2E tests pass.
- Search and media side effects are observable, idempotent, and outbox-backed.
- `npm.cmd run validate` passes, and any additional database or external-service checks are recorded.
