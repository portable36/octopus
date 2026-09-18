# Implementation Plan: CMS Pages (Draft → Publish)

**Branch**: `003-cms-pages` | **Date**: 2026-09-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification for a thin CMS Pages vertical after Admin Media
Library unblocked Phase 20.3 CMS work. Visual page builder, menus, banners,
redirects, scheduling, and vendor/store-scoped pages are out of scope.

## Summary

Add a new **content** bounded context (`backend/src/modules/content`) that owns
platform CMS pages and immutable publication snapshots.

1. **Page aggregate**: title, slug, draft body (structured blocks), draft SEO,
   status (`DRAFT` | `PUBLISHED` | `UNPUBLISHED`), optimistic `version`, archive
   flag. Edits mutate draft only.
2. **PagePublication**: append-only snapshots created on publish/rollback;
   public reads resolve the current publication by slug.
3. **Admin HTTP**: list/search/filter, CRUD, archive, publish, unpublish,
   rollback under `/api/v1/admin/content/pages*`, gated by existing
   `website.read` / `website.update` / `website.publish`.
4. **Public HTTP**: `GET /api/v1/storefront/content/pages/:slug` returns
   published snapshot only (404 otherwise).
5. **Admin UI**: `/admin/system/content/pages` list + editor (structured
   blocks, not a canvas builder); storefront route `/pages/[slug]`.
6. **Media**: image blocks store media ids; publish validates referenced media
   via existing `MEDIA_ASSET_ACCESS` / public readiness rules.
7. **Audit + optional Redis cache** for published-by-slug; Postgres is truth.

P3 preview tokens are deferred unless P1 lands early; tasks mark them optional.

## Technical Context

**Language/Version**: TypeScript 5.6+, Node.js 22 LTS  
**Primary Dependencies**: NestJS 10, MikroORM 6, PostgreSQL 16, Redis (optional
cache), Vitest, Next.js App Router  
**Storage**: PostgreSQL tables `content_pages`, `content_page_publications`
(RLS platform-scoped); Redis key optional `content:page:published:<slug>`  
**Testing**: Vitest domain + handler/API tests for create→publish→public read
and concurrency conflict  
**Target Platform**: Octopus modular monolith  
**Project Type**: NestJS DDD module + Next admin/storefront surfaces  
**Constraints**:

- No cross-module imports; Media collaboration via shared-kernel ports only.
- Fail-closed auth; never trust client role/scope.
- Optimistic concurrency on update/publish (`expectedVersion`).
- Public endpoints must not leak draft fields.
- Ponytail: structured block forms, not a visual builder.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- [x] **Modular boundaries**: New `content` module; no imports from media/settings
      internals; use `MEDIA_ASSET_ACCESS` (or thin content-specific port wrapping it).
- [x] **Tenant isolation / authz**: Platform-only pages; admin routes require
      `website.*`; public read is anonymous published-only.
- [x] **Financial/inventory**: N/A (no money/stock).
- [x] **Spec before code**: Spec + plan + tasks before implement.
- [x] **Ponytail**: Blocks JSON model; builder UI deferred; reuse website
      permissions and admin Website nav patterns.
- [x] **Validation gate**: Focused regression tests + `npm.cmd run validate`.
- [x] **Observability**: Structured logs on publish/unpublish/rollback; no
      secrets; audit events for mutations.

_Post-design re-check: still pass — schema additive, contracts fail-closed,
cache optional invalidate on publish._

## Project Structure

### Documentation (this feature)

```text
specs/003-cms-pages/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── cms-pages-api.md
└── checklists/
    └── requirements.md
```

### Source Code Touched

```text
backend/src/
├── modules/content/                    # NEW bounded context
│   ├── domain/aggregates/page.aggregate.ts
│   ├── domain/content.types.ts
│   ├── application/commands/content-page.handlers.ts
│   ├── application/ports/page-repository.interface.ts
│   ├── infrastructure/persistence/*
│   └── presentation/http/
│       ├── admin-content-pages.controller.ts
│       └── public-content-pages.controller.ts
├── modules/identity/...                # ensure website.* on platform admin roles
├── shared-kernel/...                   # only if a new port is required
└── migrations/                         # content_pages + publications + RLS

frontend/src/
├── lib/admin-content-api.ts
├── app/(admin)/admin/system/content/pages/**
└── app/(storefront)/pages/[slug]/page.tsx
```

## Complexity Tracking

| Decision                                  | Rationale                             | Ponytail ceiling                                 |
| ----------------------------------------- | ------------------------------------- | ------------------------------------------------ |
| New `content` module vs stuffing Settings | Spec FR-001; pages ≠ config documents | Module stays pages-only; menus later             |
| Structured blocks vs HTML blob            | Safer than raw HTML; builder-ready    | No DnD canvas in v1                              |
| Reuse `website.*` permissions             | Already in Identity enum              | No new permission strings unless roles lack them |
| Defer preview tokens                      | P3 in spec                            | Ship P1 without preview                          |

## Implementation Phases (this plan)

| Phase | Deliverable                                                                                                                    |
| ----- | ------------------------------------------------------------------------------------------------------------------------------ |
| 0     | [research.md](./research.md) — decisions locked                                                                                |
| 1     | [data-model.md](./data-model.md), [contracts/cms-pages-api.md](./contracts/cms-pages-api.md), [quickstart.md](./quickstart.md) |
| 2     | `/speckit-tasks` → implement P1 stories                                                                                        |
