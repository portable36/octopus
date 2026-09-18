# Tasks: CMS Pages (Draft → Publish)

**Input**: Design documents from `/specs/003-cms-pages/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Spec SC-004 requires a focused create→publish→public read test — include it.

**Organization**: Grouped by user story. MVP = US1 + US2 + US3 (P1). US4 rollback = P2. US5 preview = deferred.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [x] T001 Create module skeleton under `backend/src/modules/content/` (domain, application, infrastructure, presentation folders) and register `ContentModule` in `backend/src/app.module.ts`.
- [x] T002 [P] Confirm platform admin roles include `website.read|update|publish` in `backend/src/modules/identity/domain/policies/role-permissions.policy.ts` (add if missing).

---

## Phase 2: Foundational (BLOCKS stories)

- [x] T003 Define types/errors in `backend/src/modules/content/domain/content.types.ts` and `backend/src/modules/content/domain/errors/content.errors.ts` (statuses, block types, version conflict).
- [x] T004 Implement `Page` aggregate in `backend/src/modules/content/domain/aggregates/page.aggregate.ts` (create, updateDraft, publish, unpublish, archive, rollbackFromPublication, version bump).
- [x] T005 [P] Add ORM entities `ContentPageOrmEntity` and `ContentPagePublicationOrmEntity` under `backend/src/modules/content/infrastructure/persistence/`.
- [x] T006 Additive migration for `content_pages` + `content_page_publications` (+ unique partial slug index, RLS) under backend migrations path used by this repo.
- [x] T007 Page repository port + MikroORM adapter (`page-repository.interface.ts`, `page.repository.adapter.ts`).
- [x] T008 Wire MikroORM entities + repository in `content.module.ts`.

**Checkpoint**: Domain + persistence ready; no HTTP yet.

---

## Phase 3: User Story 1 — Author and publish (P1) 🎯 MVP

**Goal**: Create/update draft; publish/unpublish with optimistic concurrency; media validation on publish.

### Tests

- [x] T009 [P] [US1] Domain/handler test `page.aggregate.spec.ts` or `content-page.handlers.spec.ts`: draft edit does not change publication; stale `expectedVersion` conflicts; publish empty body fails.

### Implementation

- [x] T010 [US1] `ContentPageHandlers` create/update/publish/unpublish (+ media id validation via `MEDIA_ASSET_ACCESS`) in `application/commands/content-page.handlers.ts`.
- [x] T011 [US1] Admin controller routes create/get/patch/publish/unpublish in `presentation/http/admin-content-pages.controller.ts` with `@RequirePermissions('website.*')`.
- [x] T012 [US1] Audit events for create/update/publish/unpublish.

**Checkpoint**: API can create draft and publish.

---

## Phase 4: User Story 2 — Admin list/manage (P1)

**Goal**: List/search/filter/archive.

- [x] T013 [US2] List query + archive command in handlers/repository (q, status, includeArchived, pagination).
- [x] T014 [US2] Admin list + archive endpoints on admin controller.
- [x] T015 [P] [US2] Frontend `frontend/src/lib/admin-content-api.ts` + pages list/editor under `frontend/src/app/(admin)/admin/system/content/pages/` + nav link near Website.

**Checkpoint**: Admin can list and archive pages.

---

## Phase 5: User Story 3 — Public published read (P1)

**Goal**: Anonymous published-by-slug; storefront page.

### Tests

- [x] T016 [US3] Focused test: create→publish→public DTO has no draft leakage; unpublish→not found (`content-page.handlers.spec.ts` or presentation spec).

### Implementation

- [x] T017 [US3] `PublicContentPagesController` `GET /storefront/content/pages/:slug`.
- [x] T018 [US3] Storefront `frontend/src/app/(storefront)/pages/[slug]/page.tsx` (+ thin client in storefront-api or content-api).
- [x] T019 [P] [US3] Optional Redis published-slug cache + invalidate on publish/unpublish/archive (skip if time-boxed; document ponytail).

**Checkpoint**: P1 vertical complete end-to-end.

---

## Phase 6: User Story 4 — Rollback (P2)

- [ ] T020 [US4] List publications + rollback command/endpoints.
- [ ] T021 [P] [US4] Admin UI link to roll back to prior publication.

---

## Phase 7: Polish

- [x] T022 [P] Update `docs/PHASES.md` 20.3: Media library done; CMS pages vertical in progress/done; note visual builder still deferred.
- [x] T023 [P] Update `memory.md` with content module + public `/pages/[slug]` note.
- [x] T024 Focused content tests + validate through migration; dependency audit fails on pre-existing Next.js critical advisory (not introduced by this feature).

---

## Dependencies

- Phase 1 → 2 → (US1 ∥ US2 after US1 handlers exist) → US3 depends on publish.
- US4 after US1 publish/history.
- US5 preview: **not scheduled** (deferred).

## MVP

Complete T001–T019 (Phases 1–5). Then T022–T024. US4 optional same PR if small.
