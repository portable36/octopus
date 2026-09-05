# Tasks: Catalog Production Readiness and Hardening

**Input**: Design documents from `/specs/001-catalog-prod-ready/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story identifier (US1, US2, US3, US4, US5, US6)
- Exact file paths included in all descriptions.

---

## Phase 1: Setup & Foundational Prerequisites

**Purpose**: Core model and port updates that user stories depend on.

- [x] T001 [P] Update `CatalogStoreOfferSnapshot` in `backend/src/shared-kernel/application/ports/catalog-store-offer-access.port.ts` to include `productStatus`, `variantStatus`, and `isSellable` fields.
- [x] T002 [P] Define `CatalogApplicationError` error codes (`OFFER_NOT_SELLABLE`, `BARCODE_ALREADY_EXISTS`) in `backend/src/modules/catalog/domain/errors/catalog.errors.ts`.
- [x] T003 [P] Add physical dimension columns (`weight_grams`, `length_mm`, `width_mm`, `height_mm`) and barcode index to `VariantOrmEntity` in `backend/src/modules/catalog/infrastructure/persistence/variant.orm-entity.ts`.
- [x] T004 [P] Update `VariantRepository` interface in `backend/src/modules/catalog/application/ports/variant-repository.interface.ts` with `existsByVendorAndBarcode` and `findByBarcode`.

---

## Phase 2: User Story 1 - Multi-Point Sellability Validation (Priority: P1) 🎯 MVP Core

**Goal**: Block activation and purchase of store offers whose product is not published or variant is not active.

### Tests for User Story 1

- [x] T005 [P] [US1] Unit test in `backend/src/modules/catalog/application/commands/store-offer.handlers.spec.ts` proving offer activation fails when product is unpublished or variant is draft.
- [x] T006 [P] [US1] Unit test in `backend/src/modules/cart/application/commands/cart.handlers.spec.ts` proving cart `addItem` and `validate` reject offers where `isSellable` is false.

### Implementation for User Story 1

- [x] T007 [US1] Update `StoreOfferLifecycleHandler.activate` in `backend/src/modules/catalog/application/commands/store-offer.handlers.ts` to verify product status is `published` and variant status is `ACTIVE` before activation.
- [x] T008 [US1] Update `CatalogStoreOfferAccessAdapter` in `backend/src/modules/catalog/infrastructure/access/catalog-store-offer-access.adapter.ts` to query product and variant statuses and calculate `isSellable`.
- [x] T009 [US1] Update `cart.handlers.ts` in `backend/src/modules/cart/application/commands/cart.handlers.ts` to check `offer.isSellable` in both `addItem` and `validate` (raising `OFFER_UNAVAILABLE`).

---

## Phase 3: User Story 2 - Fine-Grained Catalog Authorization & Tenant Scoping (Priority: P1)

**Goal**: Enforce `@RequirePermissions` at the HTTP controller boundary and fail-closed tenant scoping in `CatalogAuthorizationService`.

### Tests for User Story 2

- [x] T010 [P] [US2] Integration test in `backend/src/modules/catalog/presentation/http/catalog.controller.spec.ts` proving unprivileged and customer tokens receive 403 Forbidden on catalog mutations.
- [x] T011 [P] [US2] Unit test in `backend/src/modules/catalog/application/services/catalog-authorization.service.spec.ts` validating defense-in-depth permission and vendor staff checks.

### Implementation for User Story 2

- [x] T012 [US2] Decorate mutation routes in `backend/src/modules/catalog/presentation/http/catalog.controller.ts` with `@RequirePermissions(...)` (`catalog.product.create`, `catalog.product.update`, `platform.admin`, `store.manage`).
- [x] T013 [US2] Harden `CatalogAuthorizationService.assertCanMutate` in `backend/src/modules/catalog/application/services/catalog-authorization.service.ts` to reject customer tokens and assert tenant scope.

---

## Phase 4: User Story 3 - Barcode & Identifier Uniqueness (Priority: P1)

**Goal**: Guarantee unique barcodes within vendor scope and prevent barcode collision.

### Tests for User Story 3

- [x] T014 [P] [US3] Unit test in `backend/src/modules/catalog/application/commands/variant.handlers.spec.ts` proving duplicate barcode creation throws `BARCODE_ALREADY_EXISTS`.

### Implementation for User Story 3

- [x] T015 [US3] Implement `existsByVendorAndBarcode` and `findByBarcode` in `backend/src/modules/catalog/infrastructure/persistence/variant.repository.adapter.ts`.
- [x] T016 [US3] Update `CreateVariantHandler` in `backend/src/modules/catalog/application/commands/variant.handlers.ts` to check barcode uniqueness prior to saving.

---

## Phase 5: User Story 4 - Hardened Public Storefront Read Models (Priority: P2)

**Goal**: Expose only active variants of published products and omit internal merchant pricing from public payloads.

### Tests for User Story 4

- [x] T017 [P] [US4] Unit test in `backend/src/modules/catalog/application/queries/public-catalog.query-handler.spec.ts` verifying draft variants and cost prices are excluded from public responses.

### Implementation for User Story 4

- [x] T018 [US4] Update `PublicCatalogQueryHandler.getPublishedProduct` in `backend/src/modules/catalog/application/queries/public-catalog.query-handler.ts` to filter variants to `ACTIVE` only and constrain offers to active variants.

---

## Phase 6: User Story 5 - Category Hierarchy Operations & Outbox Events (Priority: P2)

**Goal**: Expose category admin routes (`GET /categories/:id`, `PATCH /categories/:id`) and persist category domain events to `catalog_outbox`.

### Tests for User Story 5

- [x] T019 [P] [US5] Unit test in `backend/src/modules/catalog/application/commands/category.handlers.spec.ts` verifying category updates, move cycle prevention, and outbox event publishing.

### Implementation for User Story 5

- [x] T020 [US5] Update `CategoryRepositoryAdapter.save` in `backend/src/modules/catalog/infrastructure/persistence/category.repository.adapter.ts` to call `appendCatalogOutbox` with category uncommitted events.
- [x] T021 [US5] Expose `GET /categories/:id` and `PATCH /categories/:id` in `backend/src/modules/catalog/presentation/http/catalog.controller.ts` with `UpdateCategoryDto`.

---

## Phase 7: User Story 6 - Physical Attributes Persistence (Weight & Dimensions) (Priority: P2)

**Goal**: Persist variant weight in grams and dimensions in millimeters through ORM entities, mappers, and authoring DTOs.

### Tests for User Story 6

- [x] T022 [P] [US6] Unit test in `backend/src/modules/catalog/infrastructure/persistence/catalog.mappers.spec.ts` verifying round-trip mapping of weight and dimensions between domain and ORM.

### Implementation for User Story 6

- [x] T023 [US6] Update `applyVariantToOrm` and `variantToDomain` in `backend/src/modules/catalog/infrastructure/persistence/catalog.mappers.ts` to map weight and dimensions.
- [x] T024 [US6] Update `toAuthoringVariantDto` in `backend/src/modules/catalog/application/mappers/catalog-response.mapper.ts` and `CreateVariantDto` in `catalog.controller.ts` to accept and serialize physical attributes.

---

## Phase 8: Verification & Quality Gate

**Purpose**: Full regression and build validation.

- [ ] T025 Execute narrow test suites: `npm.cmd run test -- backend/src/modules/catalog backend/src/modules/cart`.
- [ ] T026 Execute full repository validation gate: `npm.cmd run validate`.
