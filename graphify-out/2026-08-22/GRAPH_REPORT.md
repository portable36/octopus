# Graph Report - octopus  (2026-08-22)

## Corpus Check
- 218 files · ~51,216 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1935 nodes · 3233 edges · 168 communities (130 shown, 38 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 44 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e0de6388`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AuthController
- User
- identity.errors.ts
- Money
- dependencies
- devDependencies
- layout.tsx
- scripts
- Variant
- variant.aggregate.ts
- tenant-context.storage.ts
- scope-policy.ts
- AppConfigService
- Product
- health.module.ts
- resolve-scope.handler.ts
- dependencies
- change-password.handler.ts
- compilerOptions
- auth.controller.ts
- compilerOptions
- UniqueID
- register-user.handler.ts
- TenancyController
- database.module.ts
- identity.module.ts
- RedisRefreshTokenStoreAdapter
- app.module.ts
- vendor.repository.adapter.ts
- PasswordResetStore
- VendorController
- mikro-orm.config.ts
- .applyToRequestContext
- main.ts
- app-config.service.ts
- POS.md
- Rfc7807ExceptionFilter
- frontend.md
- AuthSessionService
- Admin Dashboard and Dynamic CMS
- check-architecture.mjs
- login-user.handler.ts
- vendor.types.ts
- RedisLoginRateLimiterAdapter
- rls-session.ts
- vendor.controller.ts
- Order Module
- .prettierrc.json
- check-env.mjs
- check-migrations.mjs
- Migration20250822150000
- Migration20250822200000
- Migration20250822210000
- VendorRepository
- postcss.config.mjs
- Vendor
- PHASES.md
- next.config.ts
- next-env.d.ts
- tailwind.config.ts
- validate.mjs
- Catalog Module
- Multi-Vendor
- Architecture Contract
- VendorLifecycleHandler
- vendor.aggregate.ts
- AggregateRoot
- Identity Module
- Deployment
- Vendor Module
- Phase 30 — Production Readiness Review
- Security Baseline
- backend/package.json
- money.value-object.ts
- Coding Standards
- Audit Module
- Cart Module
- Checkout Module
- Inventory Module
- Store Module
- Objective
- Test pyramid
- tsconfig.orm.json
- service-catalog.md
- ADR-0001: Modular Monolith
- Security Engineering
- Testing Strategy (Engineering)
- Fulfillment Module
- Notification Module
- Objective
- Objective
- Objective
- Objective
- Production Operations
- scripts
- UpdateVendorHandler
- System Overview
- Cross-Module Communication
- AI-Assisted Development
- Error Handling
- Production Readiness
- Observability
- Marketplace Module
- Payout Module
- Search Module
- Objective
- Objective
- Objective
- Objective
- Objective
- Objective
- Database Rules
- ADR-0002: Event-Driven Architecture
- Data Ownership
- Pricing
- Taxation
- Customer Module
- Objective
- Objective
- Objective
- Objective
- Objective
- Objective
- Objective
- Objective
- Octopus — Multi-Vendor Multi-Store E-Commerce Platform
- PostgreSQL
- Commissions
- Promotions
- Production Implementation Phases
- Objective
- Objective
- Objective
- Objective
- Objective
- Objective
- Objective
- Objective
- Objective
- Migration20250822220000
- VendorExceptionFilter
- Objective
- Objective
- Validate Repository For AI Changes
- class-transformer
- class-validator
- ioredis
- @mikro-orm/migrations
- @mikro-orm/nestjs
- @mikro-orm/postgresql
- @nestjs/common
- @nestjs/core
- @nestjs/jwt
- @nestjs/platform-express
- @nestjs/terminus
- reflect-metadata
- rxjs
- add-tests.md
- debug-failure.md
- design-api.md
- new-module.md
- new-use-case.md
- plan-migration.md
- production-check.md
- review-change.md
- security-review.md

## God Nodes (most connected - your core abstractions)
1. `Vendor` - 66 edges
2. `Money` - 42 edges
3. `Variant` - 41 edges
4. `User` - 37 edges
5. `AppConfigService` - 36 edges
6. `Shift` - 28 edges
7. `Role` - 26 edges
8. `UniqueID` - 25 edges
9. `VendorController` - 21 edges
10. `scripts` - 21 edges

## Surprising Connections (you probably didn't know these)
- `OpeningBalanceAdjustment` --references--> `Money`  [EXTRACTED]
  backend/src/modules/pos/domain/aggregates/shift.aggregate.ts → backend/src/shared-kernel/domain/money.value-object.ts
- `ShiftProps` --references--> `Money`  [EXTRACTED]
  backend/src/modules/pos/domain/aggregates/shift.aggregate.ts → backend/src/shared-kernel/domain/money.value-object.ts
- `ProductProps` --references--> `Sku`  [EXTRACTED]
  backend/src/modules/catalog/domain/aggregates/product.aggregate.ts → backend/src/modules/catalog/domain/value-objects/sku.value-object.ts
- `Product` --inherits--> `AggregateRoot`  [EXTRACTED]
  backend/src/modules/catalog/domain/aggregates/product.aggregate.ts → backend/src/shared-kernel/domain/aggregate-root.ts
- `VariantCreateInput` --references--> `Money`  [EXTRACTED]
  backend/src/modules/catalog/domain/aggregates/variant.aggregate.ts → backend/src/shared-kernel/domain/money.value-object.ts

## Import Cycles
- None detected.

## Communities (168 total, 38 thin omitted)

### Community 0 - "AuthController"
Cohesion: 0.12
Nodes (29): ROLES, AuthController, ApiBearerAuth, ApiOperation, ApiTags, Body, Controller, Get (+21 more)

### Community 1 - "User"
Cohesion: 0.08
Nodes (10): User, UserStatus, toDomain(), toOrmEntity(), Entity, PrimaryKey, Property, UserOrmEntity (+2 more)

### Community 2 - "identity.errors.ts"
Cohesion: 0.13
Nodes (13): AccountDisabledError, AccountLockedError, ForbiddenPermissionError, ForbiddenRoleError, IdentityError, InvalidCredentialsError, InvalidPasswordResetTokenError, InvalidRefreshTokenError (+5 more)

### Community 4 - "dependencies"
Cohesion: 0.10
Nodes (21): argon2, dependencies, argon2, cookie-parser, helmet, @mikro-orm/core, @nestjs/config, nestjs-pino (+13 more)

### Community 5 - "devDependencies"
Cohesion: 0.11
Nodes (19): devDependencies, @mikro-orm/cli, @nestjs/testing, pino-pretty, supertest, ts-node, tsx, @types/cookie-parser (+11 more)

### Community 6 - "layout.tsx"
Cohesion: 0.08
Nodes (22): ErrorPageProps, metadata, HomePage(), AppProviders(), AppProvidersProps, ErrorBoundary, ErrorBoundaryProps, ErrorBoundaryState (+14 more)

### Community 7 - "scripts"
Cohesion: 0.04
Nodes (48): eslint, devDependencies, eslint, prettier, @types/node, typescript, typescript-eslint, vitest (+40 more)

### Community 9 - "variant.aggregate.ts"
Cohesion: 0.12
Nodes (12): VariantAttributeAssignment, VariantCreateInput, VariantExternalReference, VariantMediaReference, VariantProps, VariantStatus, BarcodeIdentifier, BarcodeIdentifierType (+4 more)

### Community 10 - "tenant-context.storage.ts"
Cohesion: 0.15
Nodes (20): withRequestScope(), AuthenticatedPrincipal, ContextMiddleware, Injectable, asyncLocalStorage, createRequestContext(), getCurrentStoreId(), getCurrentTenantId() (+12 more)

### Community 11 - "scope-policy.ts"
Cohesion: 0.18
Nodes (14): assertCustomerCannotAccessVendorResources(), assertStoreAccess(), assertVendorAccess(), hasAnyStaffRole(), hasVendorWideRole(), resolveActorScope(), ActorMembership, MissingStoreScopeError (+6 more)

### Community 12 - "AppConfigService"
Cohesion: 0.09
Nodes (3): AppConfigService, Injectable, Env

### Community 13 - "Product"
Cohesion: 0.11
Nodes (7): PRODUCT_REPOSITORY, ProductRepository, Product, ProductProps, Sku, ProductRepositoryAdapter, Injectable

### Community 14 - "health.module.ts"
Cohesion: 0.15
Nodes (11): DatabaseHealthIndicator, Injectable, RedisHealthIndicator, Inject, Injectable, HealthController, ApiOperation, ApiTags (+3 more)

### Community 15 - "resolve-scope.handler.ts"
Cohesion: 0.15
Nodes (10): ResolveScopeCommand, ResolveScopeHandler, Inject, Injectable, MembershipDirectoryAdapter, Injectable, ScopedRequest, MEMBERSHIP_DIRECTORY (+2 more)

### Community 16 - "dependencies"
Cohesion: 0.05
Nodes (40): autoprefixer, class-variance-authority, clsx, dependencies, class-variance-authority, clsx, next, @radix-ui/react-slot (+32 more)

### Community 17 - "change-password.handler.ts"
Cohesion: 0.15
Nodes (9): ChangePasswordCommand, RequestPasswordResetCommand, ResetPasswordCommand, PASSWORD_HASHER, PasswordHasher, PasswordPolicy, PasswordPolicyViolationError, Argon2PasswordHasherAdapter (+1 more)

### Community 18 - "compilerOptions"
Cohesion: 0.07
Nodes (27): compilerOptions, declaration, emitDecoratorMetadata, esModuleInterop, exactOptionalPropertyTypes, experimentalDecorators, forceConsistentCasingInFileNames, lib (+19 more)

### Community 19 - "auth.controller.ts"
Cohesion: 0.10
Nodes (17): RegisterUserCommand, AuthPrincipal, AuthorizationService, Injectable, Permission, PERMISSIONS, Role, permissionsForRoles() (+9 more)

### Community 20 - "compilerOptions"
Cohesion: 0.07
Nodes (28): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx, lib (+20 more)

### Community 21 - "UniqueID"
Cohesion: 0.11
Nodes (6): VARIANT_REPOSITORY, UserProps, EmailAddress, generateUuidV7(), UniqueID, ValueObject

### Community 22 - "register-user.handler.ts"
Cohesion: 0.24
Nodes (7): AuthSession, USER_REPOSITORY, UserRepository, isRole(), Inject, Injectable, UserRoleAssignerAdapter

### Community 23 - "TenancyController"
Cohesion: 0.25
Nodes (7): TenancyController, ApiBearerAuth, ApiOperation, ApiTags, Controller, Get, UseInterceptors

### Community 24 - "database.module.ts"
Cohesion: 0.24
Nodes (7): DatabaseModule, Module, createMikroOrmOptions(), PlatformSchemaLockEntity, Entity, PrimaryKey, Property

### Community 25 - "identity.module.ts"
Cohesion: 0.15
Nodes (12): ExpiredAccessTokenError, REFRESH_TOKEN_STORE, RefreshTokenStatus, AccessTokenPayload, TOKEN_SIGNER, TokenSigner, JwtPayload, JwtTokenSignerAdapter (+4 more)

### Community 26 - "RedisRefreshTokenStoreAdapter"
Cohesion: 0.27
Nodes (4): RefreshTokenRecord, RedisRefreshTokenStoreAdapter, Inject, Injectable

### Community 27 - "app.module.ts"
Cohesion: 0.11
Nodes (17): envSchema, validateEnv(), CatalogModule, Module, IdentityModule, Global, Module, TenancyModule (+9 more)

### Community 28 - "vendor.repository.adapter.ts"
Cohesion: 0.25
Nodes (5): applyToOrm(), toDomain(), Injectable, VendorRepositoryAdapter, withRlsContext()

### Community 29 - "PasswordResetStore"
Cohesion: 0.17
Nodes (7): PASSWORD_RESET_STORE, PasswordResetRecord, PasswordResetStore, RedisPasswordResetStoreAdapter, Inject, Injectable, REDIS_CLIENT

### Community 30 - "VendorController"
Cohesion: 0.14
Nodes (31): ApiPropertyOptional, AddVendorStaffRequestDto, RegisterVendorRequestDto, RejectVendorRequestDto, SuspendVendorRequestDto, ApiProperty, IsEmail, IsOptional (+23 more)

### Community 31 - "mikro-orm.config.ts"
Cohesion: 0.20
Nodes (9): TenantIsolationSampleOrmEntity, Entity, PrimaryKey, Property, Entity, PrimaryKey, Property, Unique (+1 more)

### Community 32 - ".applyToRequestContext"
Cohesion: 0.24
Nodes (5): ResolvedScope, TenantScopeInterceptor, Injectable, clearVendorStoreScope(), setTenantScope()

### Community 33 - "main.ts"
Cohesion: 0.31
Nodes (6): AppModule, Module, bootstrap(), configureApplication(), flattenValidationErrors(), registerGracefulShutdown()

### Community 35 - "POS.md"
Cohesion: 0.04
Nodes (47): 10. Sale Lifecycle, 11. Sale Lines, 12. Product Search, 13. Barcode Scanner, 14. Inventory, 15. Customer Selection, 16. Pricing, 17. Discounts (+39 more)

### Community 36 - "Rfc7807ExceptionFilter"
Cohesion: 0.29
Nodes (5): FieldError, ProblemDetails, Rfc7807ExceptionFilter, captureJson(), Catch

### Community 37 - "frontend.md"
Cohesion: 0.05
Nodes (37): Border Radius Scale, Brand & Accent, Breakpoints, Buttons, Cards & Containers, Category Accents (sport / collection chips), Collapsing Strategy, Colors (+29 more)

### Community 38 - "AuthSessionService"
Cohesion: 0.07
Nodes (19): ChangePasswordHandler, RequestPasswordResetHandler, ResetPasswordHandler, Inject, Injectable, LoginUserHandler, Inject, Injectable (+11 more)

### Community 39 - "Admin Dashboard and Dynamic CMS"
Cohesion: 0.08
Nodes (24): 10. Menus and Navigation, 11. Draft, Preview, and Publishing, 12. CMS API and Application Contracts, 13. Audit and Security, 14. Reports, POS, and Financial UI, 15. Implementation Sequence, 16. Definition of Done, 1. Purpose (+16 more)

### Community 40 - "check-architecture.mjs"
Cohesion: 0.25
Nodes (7): checkFile(), kernelRoot, LAYER_RULES, modulesRoot, segments(), srcRoot, violations

### Community 41 - "login-user.handler.ts"
Cohesion: 0.18
Nodes (9): LoginUserCommand, LOGIN_RATE_LIMITER, LoginRateLimiter, ALLOWED_TRANSITIONS, AccountDisabledError, AccountLockedError, AccountNotActiveError, InvalidUserStatusTransitionError (+1 more)

### Community 42 - "vendor.types.ts"
Cohesion: 0.16
Nodes (20): VendorProps, VendorBusinessInfo, VendorContactInfo, VendorProfile, VendorSettings, VendorStaffMember, VendorStaffRole, VendorStatus (+12 more)

### Community 43 - "RedisLoginRateLimiterAdapter"
Cohesion: 0.38
Nodes (3): RedisLoginRateLimiterAdapter, Inject, Injectable

### Community 44 - "rls-session.ts"
Cohesion: 0.53
Nodes (3): tryGetTenantContext(), RlsContextSubscriber, applyRlsSessionVariables()

### Community 45 - "vendor.controller.ts"
Cohesion: 0.22
Nodes (8): RegisterVendorCommand, VendorAccessDeniedError, VendorApplicationError, VendorNotFoundError, VendorSlugTakenError, VENDOR_REPOSITORY, USER_ROLE_ASSIGNER, UserRoleAssigner

### Community 46 - "Order Module"
Cohesion: 0.08
Nodes (24): Events, Exit criteria, Order Module, Public contracts, Related, Responsibility, Snapshots, State machine (+16 more)

### Community 47 - ".prettierrc.json"
Cohesion: 0.33
Nodes (5): printWidth, semi, singleQuote, tabWidth, trailingComma

### Community 48 - "check-env.mjs"
Cohesion: 0.33
Nodes (5): envExamplePath, exampleKeys, missing, requiredVars, root

### Community 49 - "check-migrations.mjs"
Cohesion: 0.40
Nodes (3): migrationEnv, pending, up

### Community 53 - "VendorRepository"
Cohesion: 0.09
Nodes (9): RegisterVendorHandler, Inject, Injectable, Inject, VendorRepository, GetVendorHandler, Inject, Injectable (+1 more)

### Community 63 - "Catalog Module"
Cohesion: 0.11
Nodes (18): Architecture, Attributes and options, Barcode identifiers, Brand, Catalog Module, Category, Exit criteria, Identifiers and value objects (+10 more)

### Community 64 - "Multi-Vendor"
Cohesion: 0.13
Nodes (11): Concept, Isolation rules, Multi-Store, Related, Store offer model, Concept, Hierarchy, Isolation rules (+3 more)

### Community 65 - "Architecture Contract"
Cohesion: 0.12
Nodes (16): 10. Payments, 11. Payouts, 12. Events, 13. Search, 14. API, 15. Frontend, 1. Bounded contexts, 2. Module structure (+8 more)

### Community 66 - "VendorLifecycleHandler"
Cohesion: 0.29
Nodes (3): isPlatformAdmin(), Injectable, VendorLifecycleHandler

### Community 67 - "vendor.aggregate.ts"
Cohesion: 0.24
Nodes (7): ALLOWED_TRANSITIONS, CannotRemoveLastOwnerError, InvalidVendorStatusTransitionError, VendorDomainError, VendorNotOperableError, VendorStaffAlreadyExistsError, VendorStaffNotFoundError

### Community 68 - "AggregateRoot"
Cohesion: 0.17
Nodes (7): CashMovementKind, OpeningBalanceAdjustment, SalePaymentType, ShiftProps, ShiftStatus, AggregateRoot, DomainEvent

### Community 69 - "Identity Module"
Cohesion: 0.15
Nodes (13): Architecture, Authorization contract, Events, Exit criteria, Identity Module, Key aggregates and value objects, Public contracts, Related (+5 more)

### Community 70 - "Deployment"
Cohesion: 0.20
Nodes (8): Components, Configuration, Deployment, Health and readiness, Migration policy, Related, Targets, Production Checklist

### Community 71 - "Vendor Module"
Cohesion: 0.20
Nodes (10): Architecture, Events, Exit criteria, Key invariants, Lifecycle, Public contracts, Related, Responsibility (+2 more)

### Community 72 - "Phase 30 — Production Readiness Review"
Cohesion: 0.20
Nodes (10): Architecture, Definition of Production Ready, Financial, Inventory, Observability, Operations, Phase 30 — Production Readiness Review, Reliability (+2 more)

### Community 73 - "Security Baseline"
Cohesion: 0.20
Nodes (10): Authentication, Authorization, File uploads, Input security, Logging, Secrets, Security Baseline, Tenant isolation (+2 more)

### Community 74 - "backend/package.json"
Cohesion: 0.22
Nodes (8): ./mikro-orm.config.ts, mikro-orm, configPaths, useTsNode, name, private, version, ./dist/mikro-orm.config.js

### Community 75 - "money.value-object.ts"
Cohesion: 0.25
Nodes (4): createVariant(), productId, usd(), MoneyProps

### Community 76 - "Coding Standards"
Cohesion: 0.22
Nodes (7): Architecture, Change quality, Coding Standards, Data and money, Scope and ownership, Security and tenant scope, TypeScript

### Community 77 - "Audit Module"
Cohesion: 0.22
Nodes (7): Audit Module, Audited actions (minimum), Exit criteria, Related, Responsibility, Rules, Testing requirements

### Community 78 - "Cart Module"
Cohesion: 0.22
Nodes (9): Cart Module, Exit criteria, Handoff to checkout, Invariants, Multi-vendor structure, Operations, Related, Responsibility (+1 more)

### Community 79 - "Checkout Module"
Cohesion: 0.22
Nodes (9): Checkout Module, Exit criteria, Idempotency, Invariants, Multi-vendor checkout, Related, Responsibility, Submission pipeline (+1 more)

### Community 80 - "Inventory Module"
Cohesion: 0.22
Nodes (9): Concurrency model, Events, Exit criteria, Inventory Module, Operations, Public contracts, Related, Responsibility (+1 more)

### Community 81 - "Store Module"
Cohesion: 0.22
Nodes (9): Architecture, Events, Exit criteria, Lifecycle, Related, Responsibility, Store Module, Store offers (+1 more)

### Community 82 - "Objective"
Cohesion: 0.22
Nodes (9): Authentication, Authorization, Exit Criteria, Identity, Objective, Optional Authentication, Phase 01 — Identity, Authentication & Authorization, Roles (+1 more)

### Community 83 - "Test pyramid"
Cohesion: 0.22
Nodes (9): API tests, Application tests, Domain unit tests, E2E, Integration tests, Production gates, Required negative tests, Test pyramid (+1 more)

### Community 84 - "tsconfig.orm.json"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, extends, include, mikro-orm.config.ts, ./tsconfig.json

### Community 85 - "service-catalog.md"
Cohesion: 0.25
Nodes (5): Bounded context modules (backend), External integrations, Related, Runtime services, Service Catalog

### Community 86 - "ADR-0001: Modular Monolith"
Cohesion: 0.25
Nodes (6): ADR-0001: Modular Monolith, Consequences, Context, Decision, Extraction rule, Status

### Community 87 - "Security Engineering"
Cohesion: 0.25
Nodes (6): Baseline, Checklist for new endpoints, Dependencies, Related, Security Engineering, Tenant isolation

### Community 88 - "Testing Strategy (Engineering)"
Cohesion: 0.25
Nodes (6): Canonical reference, Layer guidance, Related, Testing Strategy (Engineering), Validation gate, When to add tests

### Community 89 - "Fulfillment Module"
Cohesion: 0.25
Nodes (8): Events, Exit criteria, Fulfillment Module, Operations, Related, Responsibility, Shipment status, Testing requirements

### Community 90 - "Notification Module"
Cohesion: 0.25
Nodes (7): Delivery model, Exit criteria, Notification Module, Related, Responsibility, Rules, Testing requirements

### Community 91 - "Objective"
Cohesion: 0.25
Nodes (8): Backend, Exit Criteria, Frontend, Infrastructure, Objective, Phase 00 — Foundation & Repository Setup, Pre-work in later phases (not Phase 00 exit), Quality Gates

### Community 92 - "Objective"
Cohesion: 0.25
Nodes (8): Catalog, Dashboard, Finance, Inventory, Multi-Store, Objective, Orders, Phase 19 — Vendor Portal

### Community 93 - "Objective"
Cohesion: 0.25
Nodes (8): Categories, Media, Objective, Phase 05 — Catalog, Product, Product Variants, Store Offers, Tests

### Community 94 - "Objective"
Cohesion: 0.25
Nodes (8): Events, Exit Criteria, Features, Lifecycle, Objective, Phase 03 — Vendor Management, Tests, Vendor Aggregate

### Community 95 - "Production Operations"
Cohesion: 0.25
Nodes (8): Backups, Deployment, Graceful shutdown, Health endpoints, Incident readiness, Observability, Production Operations, Queues

### Community 96 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, migration:create, migration:pending, migration:up, start

### Community 97 - "UpdateVendorHandler"
Cohesion: 0.38
Nodes (3): Inject, Injectable, UpdateVendorHandler

### Community 98 - "System Overview"
Cohesion: 0.29
Nodes (5): 1. Structural Decoupling Map, 2. Directory Layout & Bounded Contexts, 3. Tenant Context Architecture, 4. Unified Cart Split-Payment Model, System Overview

### Community 99 - "Cross-Module Communication"
Cohesion: 0.29
Nodes (7): Allowed patterns, Cross-Module Communication, Event categories, Forbidden patterns, Principles, Related, Validation

### Community 100 - "AI-Assisted Development"
Cohesion: 0.29
Nodes (6): AI-Assisted Development, Completion protocol, Knowledge graph (Graphify), Required agent behavior, Review prompts, Trust boundaries

### Community 101 - "Error Handling"
Cohesion: 0.29
Nodes (7): API errors, Application errors, Client vs server faults, Error Handling, Related, Retry semantics, Wrapping

### Community 102 - "Production Readiness"
Cohesion: 0.29
Nodes (5): Correctness, Operations, Production Readiness, Security, Verification

### Community 103 - "Observability"
Cohesion: 0.29
Nodes (7): Alerting, Correlation, Logging, Metrics (minimum), Observability, Related, Tracing

### Community 104 - "Marketplace Module"
Cohesion: 0.29
Nodes (7): Composition pattern, Exit criteria, Marketplace Module, Multi-vendor UX, Related, Responsibility, Testing requirements

### Community 105 - "Payout Module"
Cohesion: 0.29
Nodes (7): Exit criteria, Ledger model, Payout lifecycle, Payout Module, Related, Responsibility, Testing requirements

### Community 106 - "Search Module"
Cohesion: 0.29
Nodes (7): Exit criteria, Indexing pipeline, Query rules, Related, Responsibility, Search Module, Testing requirements

### Community 107 - "Objective"
Cohesion: 0.29
Nodes (7): API, Database, Next.js, Objective, Phase 24 — Performance & Scalability, Redis, Rule

### Community 108 - "Objective"
Cohesion: 0.29
Nodes (7): API, Application, Domain, E2E, Integration, Objective, Phase 26 — Automated Testing

### Community 109 - "Objective"
Cohesion: 0.29
Nodes (7): Application Security, Authentication, Authorization, Objective, Payments, Phase 25 — Security Hardening, Secrets

### Community 110 - "Objective"
Cohesion: 0.29
Nodes (7): Authorization Hierarchy, Exit Criteria, Objective, Phase 02 — Multi-Tenancy & Security Isolation, PostgreSQL, Security Tests, Tenant Context

### Community 111 - "Objective"
Cohesion: 0.29
Nodes (7): Concurrency, Events, Inventory, Objective, Operations, Phase 06 — Inventory, Tests

### Community 112 - "Objective"
Cohesion: 0.29
Nodes (7): Critical Rule, Objective, Payment, Phase 11 — Payment, Provider Port, Providers, Security

### Community 113 - "Database Rules"
Cohesion: 0.33
Nodes (6): Database Rules, Indexing, Migrations, Optimistic concurrency, RLS, Transactions

### Community 114 - "ADR-0002: Event-Driven Architecture"
Cohesion: 0.33
Nodes (6): ADR-0002: Event-Driven Architecture, Consequences, Context, Decision, Related, Status

### Community 115 - "Data Ownership"
Cohesion: 0.33
Nodes (6): Cross-context references, Data Ownership, Ownership map, Read models, Related, Rule

### Community 116 - "Pricing"
Cohesion: 0.33
Nodes (6): Authority, Inputs, Module ownership, Pricing, Related, Rules

### Community 117 - "Taxation"
Cohesion: 0.33
Nodes (6): Concept, Module boundaries, Related, Rules, Taxation, Testing

### Community 118 - "Customer Module"
Cohesion: 0.33
Nodes (6): Customer Module, Exit criteria, Privacy, Related, Responsibility, Testing requirements

### Community 119 - "Objective"
Cohesion: 0.33
Nodes (6): Cart, Cart Operations, Multi-Vendor, Objective, Phase 08 — Cart, Tests

### Community 120 - "Objective"
Cohesion: 0.33
Nodes (6): Checkout, Idempotency, Objective, Phase 09 — Checkout, Tests, Validation

### Community 121 - "Objective"
Cohesion: 0.33
Nodes (6): Database, Object Storage, Objective, Phase 29 — Backup & Disaster Recovery, Recovery, Redis

### Community 122 - "Objective"
Cohesion: 0.33
Nodes (6): Dispatcher, Objective, Outbox, Phase 12 — Transactional Outbox & BullMQ, Queues, Reliability

### Community 123 - "Objective"
Cohesion: 0.33
Nodes (6): Features, Objective, Phase 04 — Store Management, Store, Store Lifecycle, Tests

### Community 124 - "Objective"
Cohesion: 0.33
Nodes (6): Logging, Metrics, Objective, OpenTelemetry, Phase 23 — Observability, Sentry

### Community 125 - "Objective"
Cohesion: 0.33
Nodes (6): Objective, Operations, Phase 20 — Platform Admin, Platform Configuration, Security, Vendor Management

### Community 126 - "Objective"
Cohesion: 0.33
Nodes (6): Objective, Phase 07 — Pricing & Promotion, Pricing, Promotions, Rule, Tests

### Community 127 - "Octopus — Multi-Vendor Multi-Store E-Commerce Platform"
Cohesion: 0.33
Nodes (5): Commands, Important, Octopus — Multi-Vendor Multi-Store E-Commerce Platform, Repository layout, Rule philosophy

### Community 128 - "PostgreSQL"
Cohesion: 0.40
Nodes (5): Constraints, IDs, PostgreSQL, Soft deletion, Timestamps

### Community 129 - "Commissions"
Cohesion: 0.40
Nodes (5): Calculation timing, Commissions, Concept, Related, Rules

### Community 130 - "Promotions"
Cohesion: 0.40
Nodes (5): Concept, Promotion types, Promotions, Related, Rules

### Community 131 - "Production Implementation Phases"
Cohesion: 0.40
Nodes (5): Architecture, Production Implementation Phases, Project, Repository layout, Required sequencing

### Community 132 - "Objective"
Cohesion: 0.40
Nodes (5): Channels, Events, Objective, Phase 17 — Notifications, Reliability

### Community 133 - "Objective"
Cohesion: 0.40
Nodes (5): Customer Account, Objective, Phase 18 — Customer Experience, SEO, Storefront

### Community 134 - "Objective"
Cohesion: 0.40
Nodes (5): Deployment, Deployment Strategies, Objective, Phase 27 — CI/CD, Pull Request

### Community 135 - "Objective"
Cohesion: 0.40
Nodes (5): Environments, IaC, Infrastructure, Objective, Phase 28 — Infrastructure as Code

### Community 136 - "Objective"
Cohesion: 0.40
Nodes (5): Features, Objective, Phase 13 — Shipping & Fulfillment, Shipment, Status

### Community 137 - "Objective"
Cohesion: 0.40
Nodes (5): Features, Ledger, Objective, Phase 15 — Vendor Financial Ledger & Payouts, Rules

### Community 138 - "Objective"
Cohesion: 0.40
Nodes (5): Index Pipeline, Meilisearch, Objective, Phase 16 — Search, Rule

### Community 139 - "Objective"
Cohesion: 0.40
Nodes (5): Objective, Order, Phase 10 — Orders, State Machine, Tests

### Community 140 - "Objective"
Cohesion: 0.40
Nodes (5): Objective, Phase 14 — Refunds & Returns, Refund Rules, Returns, Tests

### Community 143 - "Objective"
Cohesion: 0.50
Nodes (4): Architecture, Objective, Phase 21 — Reporting & Analytics, Reports

### Community 144 - "Objective"
Cohesion: 0.50
Nodes (4): Audit Events, Audit Record, Objective, Phase 22 — Audit & Compliance

## Knowledge Gaps
- **738 isolated node(s):** `semi`, `singleQuote`, `trailingComma`, `printWidth`, `tabWidth` (+733 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **38 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AggregateRoot` connect `AggregateRoot` to `User`, `Money`, `vendor.aggregate.ts`, `Variant`, `variant.aggregate.ts`, `login-user.handler.ts`, `Product`, `Vendor`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `Vendor` connect `Vendor` to `UpdateVendorHandler`, `VendorLifecycleHandler`, `vendor.aggregate.ts`, `AggregateRoot`, `vendor.types.ts`, `vendor.controller.ts`, `VendorRepository`, `UniqueID`, `vendor.repository.adapter.ts`, `VendorController`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `Variant` connect `Variant` to `Money`, `AggregateRoot`, `variant.aggregate.ts`, `money.value-object.ts`, `Product`, `UniqueID`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `semi`, `singleQuote`, `trailingComma` to the rest of the system?**
  _738 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AuthController` be split into smaller, more focused modules?**
  _Cohesion score 0.12367864693446089 - nodes in this community are weakly interconnected._
- **Should `User` be split into smaller, more focused modules?**
  _Cohesion score 0.07564102564102564 - nodes in this community are weakly interconnected._
- **Should `identity.errors.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1310483870967742 - nodes in this community are weakly interconnected._