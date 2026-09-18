# Research: CMS Pages

**Feature**: `003-cms-pages` | **Date**: 2026-09-18

## Decisions

### D1 — Module name: `content`

**Decision**: Create `backend/src/modules/content` (CMS/Content context per
`docs/admin-dashboard.md`).

**Alternatives**: Extend `settings` with page documents; put pages under `media`.

**Rationale**: Settings owns configuration documents and storefront config
cache. Pages have draft/publish history and must not mix with branding JSON.
Media owns files only.

### D2 — Permissions: reuse `website.read|update|publish`

**Decision**: Gate admin content-page APIs with existing Identity permissions
`website.read`, `website.update`, `website.publish` (already in
`permission.enum.ts`).

**Alternatives**: Add `content.pages.*`.

**Rationale**: Website Control Center already uses `website.*`; CMS pages are
the missing half of that product surface. Avoid permission sprawl.

### D3 — Body model: structured blocks JSON

**Decision**: Draft/published body is `ContentBlock[]` with types:
`heading`, `paragraph`, `markdown`, `image` (mediaId + optional alt).

**Alternatives**: Raw HTML; full page-builder schema with layout grids.

**Rationale**: Spec FR-008; safe default; upgrade path to visual builder without
schema rewrite.

### D4 — Public URL shape

**Decision**:

- API: `GET /api/v1/storefront/content/pages/:slug`
- Storefront page: `/pages/[slug]`

**Alternatives**: Top-level `/:slug` (conflicts with catalog routes).

**Rationale**: Avoid route collisions with products/categories/shops.

### D5 — Concurrency

**Decision**: Integer `version` on Page; update/publish require
`expectedVersion`; mismatch → 409.

**Rationale**: Spec FR-005 / SC-003; matches admin-dashboard publish rules.

### D6 — Cache

**Decision**: Optional Redis cache of published DTO by slug; invalidate on
publish/unpublish/archive/rollback. DB remains truth.

**Rationale**: Aligns with storefront config caching pattern; skip cache in
first PR if simpler—handlers still correct.

### D7 — Preview tokens

**Decision**: Defer to optional follow-up (spec P3).

**Rationale**: P1 success does not require preview; reduces surface area.

### D8 — Media validation on publish

**Decision**: Collect image `mediaId`s from blocks; resolve via
`MEDIA_ASSET_ACCESS` (or equivalent); reject publish if any asset is missing,
archived, or not ready for public use.

**Rationale**: Spec edge case; prevents broken published pages.

## Open questions resolved by defaults

| Topic                       | Default                                                                                                        |
| --------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Locale                      | Single platform default; no `locale` column variants                                                           |
| Scope                       | Platform only (`scope = PLATFORM`)                                                                             |
| Slug change while published | Allowed on draft; takes effect on next publish; old slug stops resolving when current publication slug changes |
| Soft archive                | `archivedAt` set; excluded from default list & public                                                          |

## References

- `docs/admin-dashboard.md` §§7, 11–12
- `docs/PHASES.md` Phase 20.3 CMS deferred note
- Existing Media admin library + `MEDIA_ASSET_ACCESS`
- Identity `website.*` permissions
