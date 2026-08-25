# Graph Report - octopus  (2026-08-22)

## Corpus Check
- 218 files · ~51,216 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1935 nodes · 3205 edges · 153 communities (126 shown, 27 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 44 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `be13c029`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AuthController
- User
- identity.errors.ts
- Shift
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
- identity.module.ts
- compilerOptions
- authorization.service.ts
- compilerOptions
- UniqueID
- AuthSessionService
- TenancyController
- database.module.ts
- Role
- RedisRefreshTokenStoreAdapter
- app.module.ts
- withRlsContext
- PasswordResetStore
- VendorController
- TenantIsolationSampleOrmEntity
- TenantScopeInterceptor
- main.ts
- app-config.service.ts
- POS.md
- Rfc7807ExceptionFilter
- frontend.md
- UserRepository
- Admin Dashboard and Dynamic CMS
- check-architecture.mjs
- user.aggregate.ts
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
- UpdateVendorHandler
- postcss.config.mjs
- Vendor
- PHASES.md
- next.config.ts
- next-env.d.ts
- tailwind.config.ts
- validate.mjs
- Catalog Module
- Architecture Contract
- VendorLifecycleHandler
- vendor.aggregate.ts
- AggregateRoot
- Identity Module
- Deployment
- Vendor Module
- Phase 30 — Production Readiness Review
- Security Baseline
- Payment Module
- Money
- Coding Standards
- Audit Module
- Cart Module
- Checkout Module
- Multi-Vendor
- Store Module
- Objective
- Test pyramid
- tsconfig.orm.json
- service-catalog.md
- ADR-0001: Modular Monolith
- Security Engineering
- Testing Strategy (Engineering)
- password-policy.value-object.ts
- Notification Module
- Objective
- Objective
- Objective
- Objective
- Production Operations
- Multi-Store
- Ownership and aggregate boundaries
- System Overview
- Cross-Module Communication
- AI-Assisted Development
- Error Handling
- Production Readiness
- Observability
- Marketplace Module
- Payout Module
- IdentityExceptionFilter
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
1. `Vendor` - 65 edges
2. `Variant` - 41 edges
3. `AppConfigService` - 36 edges
4. `User` - 36 edges
5. `Shift` - 27 edges
6. `Role` - 26 edges
7. `UniqueID` - 22 edges
8. `Money` - 22 edges
9. `VendorController` - 21 edges
10. `scripts` - 21 edges

## Surprising Connections (you probably didn't know these)
- `UserProps` --references--> `Role`  [EXTRACTED]
  backend/src/modules/identity/domain/aggregates/user.aggregate.ts → backend/src/modules/identity/domain/enums/role.enum.ts
- `RegisterUserCommand` --references--> `Role`  [EXTRACTED]
  backend/src/modules/identity/application/commands/register-user.handler.ts → backend/src/modules/identity/domain/enums/role.enum.ts
- `AuthPrincipal` --references--> `Role`  [EXTRACTED]
  backend/src/modules/identity/application/dto/auth-session.dto.ts → backend/src/modules/identity/domain/enums/role.enum.ts
- `RedisLoginRateLimiterAdapter` --implements--> `LoginRateLimiter`  [EXTRACTED]
  backend/src/modules/identity/infrastructure/redis/redis-login-rate-limiter.adapter.ts → backend/src/modules/identity/application/ports/login-rate-limiter.interface.ts
- `RedisRefreshTokenStoreAdapter` --implements--> `RefreshTokenStore`  [EXTRACTED]
  backend/src/modules/identity/infrastructure/redis/redis-refresh-token-store.adapter.ts → backend/src/modules/identity/application/ports/refresh-token-store.interface.ts

## Import Cycles
- None detected.

## Communities (153 total, 27 thin omitted)

### Community 0 - "AuthController"
Cohesion: 0.11
Nodes (31): AuthPrincipal, ROLES, AuthController, ApiBearerAuth, ApiOperation, ApiTags, Body, Controller (+23 more)

### Community 1 - "User"
Cohesion: 0.09
Nodes (4): User, toDomain(), Injectable, UserRepositoryAdapter

### Community 2 - "identity.errors.ts"
Cohesion: 0.12
Nodes (14): AccountDisabledError, AccountLockedError, ExpiredAccessTokenError, ForbiddenPermissionError, ForbiddenRoleError, IdentityError, InvalidCredentialsError, InvalidPasswordResetTokenError (+6 more)

### Community 4 - "dependencies"
Cohesion: 0.04
Nodes (47): argon2, dependencies, argon2, class-transformer, class-validator, cookie-parser, helmet, ioredis (+39 more)

### Community 5 - "devDependencies"
Cohesion: 0.06
Nodes (34): devDependencies, @mikro-orm/cli, @nestjs/testing, pino-pretty, supertest, ts-node, tsx, @types/cookie-parser (+26 more)

### Community 6 - "layout.tsx"
Cohesion: 0.08
Nodes (22): ErrorPageProps, metadata, HomePage(), AppProviders(), AppProvidersProps, ErrorBoundary, ErrorBoundaryProps, ErrorBoundaryState (+14 more)

### Community 7 - "scripts"
Cohesion: 0.04
Nodes (48): eslint, devDependencies, eslint, prettier, @types/node, typescript, typescript-eslint, vitest (+40 more)

### Community 9 - "variant.aggregate.ts"
Cohesion: 0.13
Nodes (12): VariantAttributeAssignment, VariantCreateInput, VariantExternalReference, VariantMediaReference, VariantProps, VariantStatus, BarcodeIdentifier, BarcodeIdentifierType (+4 more)

### Community 10 - "tenant-context.storage.ts"
Cohesion: 0.14
Nodes (22): withRequestScope(), AuthenticatedPrincipal, ContextMiddleware, Injectable, asyncLocalStorage, clearVendorStoreScope(), createRequestContext(), getCurrentStoreId() (+14 more)

### Community 11 - "scope-policy.ts"
Cohesion: 0.17
Nodes (15): assertCustomerCannotAccessVendorResources(), assertStoreAccess(), assertVendorAccess(), hasAnyStaffRole(), hasVendorWideRole(), resolveActorScope(), ActorMembership, MissingStoreScopeError (+7 more)

### Community 12 - "AppConfigService"
Cohesion: 0.09
Nodes (3): AppConfigService, Injectable, Env

### Community 13 - "Product"
Cohesion: 0.10
Nodes (9): PRODUCT_REPOSITORY, ProductRepository, CatalogModule, Module, Product, ProductProps, Sku, ProductRepositoryAdapter (+1 more)

### Community 14 - "health.module.ts"
Cohesion: 0.15
Nodes (11): DatabaseHealthIndicator, Injectable, RedisHealthIndicator, Inject, Injectable, HealthController, ApiOperation, ApiTags (+3 more)

### Community 15 - "resolve-scope.handler.ts"
Cohesion: 0.12
Nodes (15): ResolveScopeCommand, ResolveScopeHandler, Inject, Injectable, MembershipDirectoryAdapter, Injectable, Entity, PrimaryKey (+7 more)

### Community 16 - "dependencies"
Cohesion: 0.05
Nodes (40): autoprefixer, class-variance-authority, clsx, dependencies, class-variance-authority, clsx, next, @radix-ui/react-slot (+32 more)

### Community 17 - "identity.module.ts"
Cohesion: 0.12
Nodes (26): ChangePasswordCommand, ChangePasswordHandler, RequestPasswordResetCommand, RequestPasswordResetHandler, ResetPasswordCommand, ResetPasswordHandler, Injectable, LoginUserCommand (+18 more)

### Community 18 - "compilerOptions"
Cohesion: 0.07
Nodes (27): compilerOptions, declaration, emitDecoratorMetadata, esModuleInterop, exactOptionalPropertyTypes, experimentalDecorators, forceConsistentCasingInFileNames, lib (+19 more)

### Community 19 - "authorization.service.ts"
Cohesion: 0.18
Nodes (11): AuthorizationService, Injectable, Permission, PERMISSIONS, permissionsForRoles(), ROLE_PERMISSIONS, roleHasPermission(), PERMISSIONS_KEY (+3 more)

### Community 20 - "compilerOptions"
Cohesion: 0.07
Nodes (28): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx, lib (+20 more)

### Community 21 - "UniqueID"
Cohesion: 0.13
Nodes (5): VARIANT_REPOSITORY, EmailAddress, generateUuidV7(), UniqueID, ValueObject

### Community 22 - "AuthSessionService"
Cohesion: 0.18
Nodes (4): AuthSession, AuthSessionService, Inject, Injectable

### Community 23 - "TenancyController"
Cohesion: 0.25
Nodes (7): TenancyController, ApiBearerAuth, ApiOperation, ApiTags, Controller, Get, UseInterceptors

### Community 24 - "database.module.ts"
Cohesion: 0.24
Nodes (7): DatabaseModule, Module, createMikroOrmOptions(), PlatformSchemaLockEntity, Entity, PrimaryKey, Property

### Community 25 - "Role"
Cohesion: 0.14
Nodes (11): RegisterUserCommand, AccessTokenPayload, TokenSigner, isRole(), Role, Injectable, UserRoleAssignerAdapter, JwtPayload (+3 more)

### Community 26 - "RedisRefreshTokenStoreAdapter"
Cohesion: 0.27
Nodes (4): RefreshTokenRecord, RedisRefreshTokenStoreAdapter, Inject, Injectable

### Community 27 - "app.module.ts"
Cohesion: 0.12
Nodes (15): envSchema, validateEnv(), IdentityModule, Global, Module, TenancyModule, Global, Module (+7 more)

### Community 28 - "withRlsContext"
Cohesion: 0.18
Nodes (4): slugify(), Injectable, VendorRepositoryAdapter, withRlsContext()

### Community 29 - "PasswordResetStore"
Cohesion: 0.18
Nodes (6): PasswordResetRecord, PasswordResetStore, RedisPasswordResetStoreAdapter, Inject, Injectable, REDIS_CLIENT

### Community 30 - "VendorController"
Cohesion: 0.14
Nodes (31): ApiPropertyOptional, AddVendorStaffRequestDto, RegisterVendorRequestDto, RejectVendorRequestDto, SuspendVendorRequestDto, ApiProperty, IsEmail, IsOptional (+23 more)

### Community 31 - "TenantIsolationSampleOrmEntity"
Cohesion: 0.40
Nodes (4): TenantIsolationSampleOrmEntity, Entity, PrimaryKey, Property

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

### Community 38 - "UserRepository"
Cohesion: 0.08
Nodes (9): Inject, Inject, Inject, PasswordHasher, RefreshTokenStore, UserRepository, Argon2PasswordHasherAdapter, Injectable (+1 more)

### Community 39 - "Admin Dashboard and Dynamic CMS"
Cohesion: 0.08
Nodes (24): 10. Menus and Navigation, 11. Draft, Preview, and Publishing, 12. CMS API and Application Contracts, 13. Audit and Security, 14. Reports, POS, and Financial UI, 15. Implementation Sequence, 16. Definition of Done, 1. Purpose (+16 more)

### Community 40 - "check-architecture.mjs"
Cohesion: 0.25
Nodes (7): checkFile(), kernelRoot, LAYER_RULES, modulesRoot, segments(), srcRoot, violations

### Community 41 - "user.aggregate.ts"
Cohesion: 0.16
Nodes (13): ALLOWED_TRANSITIONS, UserProps, UserStatus, AccountDisabledError, AccountLockedError, AccountNotActiveError, InvalidUserStatusTransitionError, UserDomainError (+5 more)

### Community 42 - "vendor.types.ts"
Cohesion: 0.15
Nodes (21): VendorProps, VendorBusinessInfo, VendorContactInfo, VendorProfile, VendorStaffMember, VendorStaffRole, VendorStatus, applyToOrm() (+13 more)

### Community 43 - "RedisLoginRateLimiterAdapter"
Cohesion: 0.38
Nodes (3): RedisLoginRateLimiterAdapter, Inject, Injectable

### Community 44 - "rls-session.ts"
Cohesion: 0.53
Nodes (3): tryGetTenantContext(), RlsContextSubscriber, applyRlsSessionVariables()

### Community 45 - "vendor.controller.ts"
Cohesion: 0.18
Nodes (11): RegisterVendorCommand, RegisterVendorHandler, Inject, Injectable, VendorAccessDeniedError, VendorApplicationError, VendorNotFoundError, VendorSlugTakenError (+3 more)

### Community 46 - "Order Module"
Cohesion: 0.08
Nodes (24): Events, Exit criteria, Fulfillment Module, Operations, Related, Responsibility, Shipment status, Testing requirements (+16 more)

### Community 47 - ".prettierrc.json"
Cohesion: 0.33
Nodes (5): printWidth, semi, singleQuote, tabWidth, trailingComma

### Community 48 - "check-env.mjs"
Cohesion: 0.33
Nodes (5): envExamplePath, exampleKeys, missing, requiredVars, root

### Community 49 - "check-migrations.mjs"
Cohesion: 0.40
Nodes (3): migrationEnv, pending, up

### Community 53 - "UpdateVendorHandler"
Cohesion: 0.16
Nodes (6): Inject, Injectable, UpdateVendorHandler, GetVendorHandler, Inject, Injectable

### Community 55 - "Vendor"
Cohesion: 0.09
Nodes (3): VendorRepository, Vendor, VendorSettings

### Community 63 - "Catalog Module"
Cohesion: 0.15
Nodes (13): Architecture, Attributes and options, Barcode identifiers, Catalog Module, Exit criteria, Identifiers and value objects, Lifecycle and publication, Media and thumbnail rules (+5 more)

### Community 65 - "Architecture Contract"
Cohesion: 0.06
Nodes (32): 10. Payments, 11. Payouts, 12. Events, 13. Search, 14. API, 15. Frontend, 1. Bounded contexts, 2. Module structure (+24 more)

### Community 66 - "VendorLifecycleHandler"
Cohesion: 0.24
Nodes (4): isPlatformAdmin(), Inject, Injectable, VendorLifecycleHandler

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

### Community 74 - "Payment Module"
Cohesion: 0.25
Nodes (8): Callback handling, Exit criteria, Payment Module, Provider port, Related, Responsibility, Security, Testing requirements

### Community 75 - "Money"
Cohesion: 0.12
Nodes (5): createVariant(), productId, usd(), Money, MoneyProps

### Community 76 - "Coding Standards"
Cohesion: 0.22
Nodes (7): Architecture, Change quality, Coding Standards, Data and money, Scope and ownership, Security and tenant scope, TypeScript

### Community 77 - "Audit Module"
Cohesion: 0.29
Nodes (7): Audit Module, Audited actions (minimum), Exit criteria, Related, Responsibility, Rules, Testing requirements

### Community 78 - "Cart Module"
Cohesion: 0.22
Nodes (9): Cart Module, Exit criteria, Handoff to checkout, Invariants, Multi-vendor structure, Operations, Related, Responsibility (+1 more)

### Community 79 - "Checkout Module"
Cohesion: 0.22
Nodes (9): Checkout Module, Exit criteria, Idempotency, Invariants, Multi-vendor checkout, Related, Responsibility, Submission pipeline (+1 more)

### Community 80 - "Multi-Vendor"
Cohesion: 0.33
Nodes (6): Concept, Hierarchy, Isolation rules, Module ownership, Multi-Vendor, Related

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
Cohesion: 0.33
Nodes (6): ADR-0001: Modular Monolith, Consequences, Context, Decision, Extraction rule, Status

### Community 87 - "Security Engineering"
Cohesion: 0.33
Nodes (6): Baseline, Checklist for new endpoints, Dependencies, Related, Security Engineering, Tenant isolation

### Community 88 - "Testing Strategy (Engineering)"
Cohesion: 0.25
Nodes (6): Canonical reference, Layer guidance, Related, Testing Strategy (Engineering), Validation gate, When to add tests

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

### Community 96 - "Multi-Store"
Cohesion: 0.40
Nodes (5): Concept, Isolation rules, Multi-Store, Related, Store offer model

### Community 97 - "Ownership and aggregate boundaries"
Cohesion: 0.40
Nodes (5): Brand, Category, Ownership and aggregate boundaries, Product aggregate, Variant

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
Cohesion: 0.20
Nodes (5): Correctness, Operations, Production Readiness, Security, Verification

### Community 103 - "Observability"
Cohesion: 0.29
Nodes (7): Alerting, Correlation, Logging, Metrics (minimum), Observability, Related, Tracing

### Community 104 - "Marketplace Module"
Cohesion: 0.29
Nodes (7): Composition pattern, Exit criteria, Marketplace Module, Multi-vendor UX, Related, Responsibility, Testing requirements

### Community 105 - "Payout Module"
Cohesion: 0.14
Nodes (12): Calculation timing, Commissions, Concept, Related, Rules, Exit criteria, Ledger model, Payout lifecycle (+4 more)

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
Cohesion: 0.18
Nodes (11): Constraints, Database Rules, IDs, Indexing, Migrations, Optimistic concurrency, PostgreSQL, RLS (+3 more)

### Community 114 - "ADR-0002: Event-Driven Architecture"
Cohesion: 0.25
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
- **740 isolated node(s):** `Important`, `Repository layout`, `Rule philosophy`, `Commands`, `name` (+735 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CurrentUser` connect `VendorController` to `AuthController`, `identity.module.ts`, `vendor.controller.ts`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `UniqueID` connect `UniqueID` to `vendor.aggregate.ts`, `AggregateRoot`, `Variant`, `variant.aggregate.ts`, `user.aggregate.ts`, `Money`, `vendor.types.ts`, `Product`, `resolve-scope.handler.ts`, `withRlsContext`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `AggregateRoot` connect `AggregateRoot` to `vendor.aggregate.ts`, `Variant`, `variant.aggregate.ts`, `user.aggregate.ts`, `Product`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `Important`, `Repository layout`, `Rule philosophy` to the rest of the system?**
  _740 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AuthController` be split into smaller, more focused modules?**
  _Cohesion score 0.1147086031452359 - nodes in this community are weakly interconnected._
- **Should `User` be split into smaller, more focused modules?**
  _Cohesion score 0.0896551724137931 - nodes in this community are weakly interconnected._
- **Should `identity.errors.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12121212121212122 - nodes in this community are weakly interconnected._