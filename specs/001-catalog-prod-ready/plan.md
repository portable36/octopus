# Implementation Plan: Catalog Production Readiness and Hardening

**Branch**: `001-catalog-prod-ready` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-catalog-prod-ready/spec.md` with decisions:

- Q1 = C (Full module production hardening)
- Q2 = A (Sellability chain at Catalog activate + Cart validate)
- Q3 = A (Wire Identity permissions + vendor staff tenant boundary)
- Q4 = A (Defer Brand aggregate & dynamic AttributeDefinition engine as documented debt)
- Q5 = A (Deliver via Spec Kit)

## Summary

Harden the `Catalog` module to achieve full production readiness by:

1. Enforcing a strict multi-point sellability chain across Catalog offer activation and Cart item addition/validation (Product `published` + Variant `ACTIVE` + StoreOffer `active`).
2. Hardening authorization with defense-in-depth: attaching `@RequirePermissions(...)` to all controller mutation routes, enforcing permissions in `PermissionsGuard`, and tightening `CatalogAuthorizationService` to prevent unauthorized or customer token mutation.
3. Adding barcode uniqueness validation within vendor scope at both application service and repository layers.
4. Persisting physical attributes (`weightGrams`, `dimensions` in mm) through ORM entities, mappers, and authoring DTOs.
5. Exposing full Category hierarchy management routes (`GET /categories/:id`, `PATCH /categories/:id` for rename/move/SEO with cycle prevention) and persisting category domain events to `catalog_outbox`.
6. Hardening public read models to only return active variants of published products and omitting internal cost prices.

## Technical Context

**Language/Version**: TypeScript 5.6+, Node.js 22 LTS  
**Primary Dependencies**: NestJS 10, MikroORM 6, PostgreSQL 16, Vitest, Class-Validator, Class-Transformer  
**Storage**: PostgreSQL (`catalog_products`, `catalog_variants`, `catalog_store_offers`, `catalog_categories`, `catalog_outbox`)  
**Testing**: Vitest unit, domain, and controller integration tests  
**Target Platform**: Linux / Windows multi-vendor server runtime  
**Project Type**: NestJS Modular Monolith with DDD and Clean Architecture  
**Performance Goals**: <50ms p95 for public PDP catalog responses, single-query batch resolution for cart offer validation  
**Constraints**: Zero cross-module imports (strict modular monolith); Row-Level Security (RLS) tenant isolation; integer minor units for pricing  
**Scale/Scope**: Multi-vendor, multi-store catalog supporting thousands of variants per vendor

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- [x] **Tenant Isolation**: All queries and mutations operate within vendor scope or store scope via `withRlsContext` and `CatalogAuthorizationService`.
- [x] **Modular Monolith**: Cross-module communication between Catalog and Cart utilizes ports in `shared-kernel` (`CatalogStoreOfferAccessPort`). No direct module-to-module imports.
- [x] **Financial Correctness**: Currency consistency asserted on money inputs; prices stored in integer minor units.
- [x] **Transactional Outbox**: All domain events appended to `catalog_outbox` inside the entity's database transaction.
- [x] **Validation Gate**: Strict TypeScript, class-validator DTOs, and comprehensive regression tests.

## Project Structure

### Documentation (this feature)

```text
specs/001-catalog-prod-ready/
├── plan.md              # Architectural implementation plan
├── research.md          # Architectural research & technical decisions
├── data-model.md        # Entity definitions & schema migrations
├── quickstart.md        # Verification and scenario runbook
├── contracts/           # API contract definitions
│   └── catalog-api.md
└── checklists/
    └── requirements.md  # Quality validation checklist
```

### Source Code Touched

```text
backend/src/
├── shared-kernel/
│   └── application/ports/
│       └── catalog-store-offer-access.port.ts          # Enhanced snapshot with product/variant status & isSellable
├── modules/
│   ├── catalog/
│   │   ├── application/
│   │   │   ├── commands/
│   │   │   │   ├── category.handlers.ts               # Move/rename/SEO/archive commands
│   │   │   │   ├── product.handlers.ts                # Verification of variant sellability on publish
│   │   │   │   ├── store-offer.handlers.ts            # Enforce product published + variant active on activate
│   │   │   │   └── variant.handlers.ts                # Barcode collision check & weight/dimensions handling
│   │   │   ├── mappers/
│   │   │   │   └── catalog-response.mapper.ts         # Include physical attributes in authoring DTOs
│   │   │   ├── ports/
│   │   │   │   ├── category-repository.interface.ts   # FindById, ancestor queries
│   │   │   │   └── variant-repository.interface.ts    # existsByVendorAndBarcode, findByBarcode
│   │   │   ├── queries/
│   │   │   │   └── public-catalog.query-handler.ts    # Filter non-active variants from public PDP
│   │   │   ├── services/
│   │   │   │   └── catalog-authorization.service.ts   # Defense-in-depth permission & role assertions
│   │   │   ├── domain/
│   │   │   │   └── errors/
│   │   │   │       └── catalog.errors.ts              # New error types (OFFER_NOT_SELLABLE, BARCODE_EXISTS)
│   │   │   ├── infrastructure/
│   │   │   │   ├── access/
│   │   │   │   │   └── catalog-store-offer-access.adapter.ts # Populate product/variant status & isSellable
│   │   │   │   └── persistence/
│   │   │   │       ├── category.repository.adapter.ts # Append events to catalog_outbox
│   │   │   │       ├── variant.orm-entity.ts          # Weight and dimensions columns
│   │   │   │       ├── variant.repository.adapter.ts  # Barcode check implementation
│   │   │   │       └── catalog.mappers.ts             # Map weight/dimensions to/from ORM entity
│   │   │   └── presentation/http/
│   │   │       ├── catalog.controller.ts              # Add @RequirePermissions, category PATCH/GET routes
│   │   │       └── public-catalog.controller.ts       # Public endpoints
│   └── cart/
│       └── application/commands/
│           └── cart.handlers.ts                       # Enforce offer.isSellable in addItem and validate
```

## Complexity Tracking

No violations. Reuses existing architecture, value objects, outbox infrastructure, and permission guards without adding unnecessary libraries or speculative abstractions.
