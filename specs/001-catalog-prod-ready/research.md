# Research & Technical Decisions: Catalog Production Readiness

## Overview

This document records the architectural analysis, technical investigations, and design decisions for hardening the `Catalog` module to full production readiness, closing P0, P1, and P2 gaps identified during assessment and grilled decisions (Q1=C, Q2=A, Q3=A, Q4=A, Q5=A).

---

## Decision 1: Sellability Chain Enforcement (Catalog + Cart)

### Problem

Previously, a store offer could be activated even if its parent product was in `DRAFT` status or its variant was in `DRAFT` status. In addition, the cart module (`cart.handlers.ts`) verified that the store offer had `status === 'active'`, but did not check whether the product was published or the variant was active. This allowed unpublished/draft items to be added to cart and purchased.

### Solution

Enforce sellability at two architectural checkpoints:

1. **Catalog Store Offer Activation (`StoreOfferLifecycleHandler.activate`)**:
   - Check that the referenced `Product` is in `published` status.
   - Check that the referenced `Variant` is in `ACTIVE` status.
   - If either check fails, reject activation with `CatalogApplicationError('Cannot activate offer: product must be published and variant must be active.', 'OFFER_NOT_SELLABLE')`.
2. **Cross-Module Store Offer Snapshot & Cart Validation (`CatalogStoreOfferAccessPort` + `CartHandlers`)**:
   - Enhance `CatalogStoreOfferSnapshot` in `shared-kernel` to include `productStatus: string`, `variantStatus: string`, and `isSellable: boolean` (where `isSellable` is `status === 'active' && isAvailable && productStatus === 'published' && variantStatus === 'ACTIVE'`).
   - `CatalogStoreOfferAccessAdapter` joins or queries `ProductOrmEntity` and `VariantOrmEntity` within the query context to populate these fields.
   - In `cart.handlers.ts`:
     - `addItem`: verify `offer.isSellable` (reject with `CartOfferUnavailableError` if false).
     - `validate`: if `!offer.isSellable`, emit `OFFER_UNAVAILABLE` issue so checkout is blocked.

---

## Decision 2: Fine-Grained Authorization & Defense-in-Depth

### Problem

1. `CatalogController` did not use `@RequirePermissions(...)`, meaning the global `PermissionsGuard` did not evaluate granular permissions (`catalog.product.create`, `catalog.product.update`, `catalog.product.read`).
2. `CatalogAuthorizationService` only checked role membership for `PLATFORM_ADMIN` or staff membership in `vendor.staffUserIds`, ignoring fine-grained permissions. Plain customers or unprivileged roles could hit authoring endpoints if they passed basic authentication.

### Solution

1. **Controller HTTP Gate (`PermissionsGuard`)**:
   - Decorate `catalog.controller.ts` endpoints with `@RequirePermissions`:
     - `POST /products`: `catalog.product.create`
     - `PATCH /products/:id`: `catalog.product.update`
     - `POST /products/:id/publish`, `/unpublish`, `/archive`: `catalog.product.update`
     - `POST /products/:id/variants`: `catalog.product.create`
     - `POST /variants/:variantId/*`: `catalog.product.update`
     - `POST /store-offers`: `store.manage` or `catalog.product.create`
     - `POST /categories`: `platform.admin`
     - `PATCH /categories/:id`, `POST /categories/:id/archive`: `platform.admin`
2. **Application Service Defense-in-Depth (`CatalogAuthorizationService`)**:
   - `assertCanMutate`:
     - Fails closed if the caller does not have vendor staff/owner membership OR platform admin role.
     - Specifically rejects customers (`CUSTOMER`) from calling mutation handlers.
   - `assertCanRead`:
     - Internal authoring queries require vendor staff membership or platform admin. Public catalog queries go through `public-catalog.controller.ts` (decorated with `@Public()`).

---

## Decision 3: Barcode Integrity & Collision Prevention

### Problem

`VariantOrmEntity` contained nullable `barcode`, `gtin`, `ean`, `upc` fields, but had no unique constraint or application-level collision check. In multi-vendor or POS scanning, duplicate barcodes cause scanning ambiguities.

### Solution

1. **Application-Level Check**:
   - Add `existsByVendorAndBarcode(vendorId: string, barcode: string)` to `VariantRepository`.
   - In `CreateVariantHandler`: If barcode is provided, verify uniqueness within the vendor scope. If a duplicate exists, throw `CatalogApplicationError('Barcode already registered for this vendor.', 'BARCODE_ALREADY_EXISTS')` (mapped to HTTP 409 Conflict).
2. **Persistence Index**:
   - Add a database unique index or partial unique index on `(vendor_id, barcode) WHERE barcode IS NOT NULL` in MikroORM `VariantOrmEntity`.

---

## Decision 4: Physical Attributes Persistence (Weight & Dimensions)

### Problem

`Variant` aggregate and value objects (`Weight`, `Dimensions`) supported weight in grams and dimensions in millimeters, but `VariantOrmEntity` and `catalog.mappers.ts` did not persist or hydrate them to the database.

### Solution

1. In `VariantOrmEntity`:
   - `@Property({ fieldName: 'weight_grams', nullable: true }) weightGrams: number | null = null;`
   - `@Property({ fieldName: 'length_mm', nullable: true }) lengthMm: number | null = null;`
   - `@Property({ fieldName: 'width_mm', nullable: true }) widthMm: number | null = null;`
   - `@Property({ fieldName: 'height_mm', nullable: true }) heightMm: number | null = null;`
2. In `catalog.mappers.ts`:
   - `variantToDomain`: rehydrate `weight` and `dimensions` if columns are present.
   - `applyVariantToOrm`: map domain `variant.weight?.grams` and `variant.dimensions` to entity columns.
3. In `toAuthoringVariantDto`: include `weightGrams` and `dimensions`.

---

## Decision 5: Category Management Routes & Outbox Event Publishing

### Problem

1. `UpdateCategoryHandler` had methods for `rename`, `move`, `updateSeo`, and `archive`, but `CatalogController` only exposed an endpoint for `archive`.
2. `Category` aggregate emitted domain events (`CategoryCreated`, `CategoryRenamed`, `CategoryMoved`, `CategorySeoUpdated`, `CategoryArchived`), but `CategoryRepositoryAdapter.save()` did not write them to `catalog_outbox`.

### Solution

1. In `CategoryRepositoryAdapter.save()`:
   - Call `await appendCatalogOutbox(tx, category.id.value, category.getUncommittedEvents());` exactly like `product.repository.adapter.ts` and `variant.repository.adapter.ts`.
2. In `CatalogController`:
   - Expose `GET /categories/:categoryId`
   - Expose `PATCH /categories/:categoryId` with `UpdateCategoryDto` supporting `name`, `parentId`, `sortOrder`, and `seo`.
   - Use `updateCategory.rename`, `updateCategory.move`, and `updateCategory.updateSeo`.

---

## Decision 6: Public Read-Model Hardening

### Problem

`PublicCatalogQueryHandler.getPublishedProduct` returned all variants of a published product, including variants in `DRAFT` or `ARCHIVED` status.

### Solution

- Filter variants in `getPublishedProduct`:
  `const sellableVariants = variants.filter((v) => v.status === 'ACTIVE');`
- Filter offers to only those referencing `sellableVariants`:
  `const activeVariantIds = new Set(sellableVariants.map((v) => v.id.value));`
  `const validOffers = offers.filter((o) => activeVariantIds.has(o.variantId));`
- Pass `sellableVariants` and `validOffers` to `toStorefrontProductDto`.
