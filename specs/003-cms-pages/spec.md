# Feature Specification: CMS Pages (Draft → Publish)

**Feature Branch**: `003-cms-pages`

**Created**: 2026-09-18

**Status**: Draft

**Input**: Next roadmap item after Admin Media Library. Phase 20.3 deferred
"CMS page builder / full draft→publish versioning" until Media + CMS exist.
Media library is available. This feature delivers a **thin CMS Pages vertical**
(not a visual page builder): platform content pages with draft→publish,
admin authoring, and public published rendering by slug.

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Author and publish a platform page (Priority: P1)

A platform administrator creates a content page (for example About or Shipping
Policy), edits a draft without changing what shoppers see, then publishes so
the live storefront serves the published version at a stable public URL.

**Why this priority**: Unblocks legal/informational storefront pages and
replaces ad-hoc hardcoded routes. Draft/publish is the core CMS invariant
documented in Website Control Center.

**Independent Test**: Create page → edit draft → confirm public slug still 404
or shows prior published version → publish → public slug returns the new
content → unpublish → public slug returns not found.

**Acceptance Scenarios**:

1. **Given** an authorized platform admin, **When** they create a page with
   title and unique slug, **Then** the page is stored as DRAFT and is not
   visible on any public content endpoint.
2. **Given** a DRAFT page, **When** the admin updates title, body blocks, or
   SEO fields, **Then** only the draft changes; any previously published
   snapshot remains unchanged for public readers.
3. **Given** a valid DRAFT (or a draft newer than the live publication),
   **When** the admin publishes with the expected version, **Then** the public
   slug serves the newly published content and an immutable publication record
   is retained.
4. **Given** a PUBLISHED page, **When** the admin unpublishes, **Then** the
   public slug returns not found while the draft remains editable in admin.
5. **Given** a concurrent edit where the client's expected version is stale,
   **When** they publish or update, **Then** the system rejects the mutation
   with a conflict so two admins cannot silently overwrite each other.

---

### User Story 2 - Browse and manage pages in admin (Priority: P1)

Platform admins list, search, open, and archive content pages from the admin
Website / Content area without touching Settings branding documents.

**Why this priority**: Without list/search, publishing is not operable for more
than a handful of pages.

**Independent Test**: Seed several pages in mixed statuses; list with search and
status filter; archive one; confirm archived pages are excluded from default
lists and public resolution.

**Acceptance Scenarios**:

1. **Given** multiple pages, **When** an admin lists pages, **Then** they see
   title, slug, status, updated time, and can filter by status and search by
   title/slug.
2. **Given** an existing page, **When** an admin archives it, **Then** it is
   removed from default lists and public resolution; hard delete of history is
   not required in v1.
3. **Given** a caller without content-page permissions, **When** they call any
   admin content-page endpoint, **Then** the request fails closed (403).

---

### User Story 3 - Shoppers read published pages (Priority: P1)

A storefront visitor opens a published page by slug and sees title, body, and
SEO-friendly metadata. Unpublished or draft-only pages never leak.

**Why this priority**: Public read is the customer-facing value of CMS pages.

**Independent Test**: Publish a page; fetch by slug anonymously; confirm draft
fields that differ from the publication are not returned; attempt slug of a
draft-only page and receive not found.

**Acceptance Scenarios**:

1. **Given** a PUBLISHED page, **When** anyone requests it by slug on the
   public content endpoint, **Then** they receive the published title, body,
   and SEO fields only.
2. **Given** a DRAFT-only or UNPUBLISHED page, **When** anyone requests it by
   slug publicly, **Then** the system returns not found (no draft leakage).
3. **Given** a published page whose body references a media asset ID, **When**
   the storefront renders the page, **Then** media is resolved through the
   existing public media URL rules (no raw storage credentials).

---

### User Story 4 - Rollback to a previous publication (Priority: P2)

An admin discovers a bad publish and rolls back to a prior publication without
deleting history.

**Why this priority**: Safety net for content mistakes; secondary to first
publish path.

**Independent Test**: Publish version A, publish version B, rollback to A;
public slug shows A; history still lists A and B.

**Acceptance Scenarios**:

1. **Given** at least two publication records for a page, **When** an admin
   rolls back to an earlier publication id, **Then** a new publication is
   created from that snapshot (history is append-only) and the public slug
   serves that content.
2. **Given** a publication id that does not belong to the page, **When**
   rollback is requested, **Then** the system rejects the request.

---

### User Story 5 - Preview draft before publish (Priority: P3)

An admin previews the current draft via a short-lived, scoped preview token so
unpublished content is never available on normal public URLs.

**Why this priority**: Improves editorial confidence; publish can ship without
it if list/edit/publish/public read are solid.

**Independent Test**: Create preview token for a draft; open preview URL with
token; confirm token expiry and that the same slug without token still 404s
when unpublished.

**Acceptance Scenarios**:

1. **Given** a DRAFT page, **When** an admin creates a preview, **Then** they
   receive a time-limited preview capability that returns draft content only
   when the token is presented.
2. **Given** an expired or forged preview token, **When** preview is
   requested, **Then** the system denies access.

---

### Edge Cases

- Duplicate slug on create/update is rejected with a clear conflict.
- Empty title or invalid slug format is rejected at the boundary.
- Publish of an empty body (no blocks) is rejected.
- Archiving a published page unpublishes it for public readers.
- Referenced media that is archived/quarantined must not break publish
  validation: reject publish if a referenced media id is not ready/publicly
  resolvable.
- Locale is single default locale for v1 (platform default); no multi-locale
  variants in this feature.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a dedicated Content/CMS bounded context that
  owns pages and publication records (Media remains owned by Media).
- **FR-002**: System MUST support page lifecycle states at least: DRAFT,
  PUBLISHED, UNPUBLISHED (archived pages are not publicly resolvable).
- **FR-003**: System MUST allow authorized platform admins to create, update,
  list, get, archive, publish, and unpublish pages.
- **FR-004**: Editing MUST update draft state only and MUST NOT mutate the live
  published snapshot until an explicit publish succeeds.
- **FR-005**: Publish MUST validate the draft, check expected version
  (optimistic concurrency), create an immutable publication record, and make
  that snapshot the public truth for the slug.
- **FR-006**: Unpublish MUST remove the page from public resolution while
  retaining draft and publication history.
- **FR-007**: Public readers MUST retrieve published pages by slug and MUST
  NOT receive draft-only or unpublished content.
- **FR-008**: Page body MUST be a structured list of blocks (heading, paragraph,
  markdown, image-by-media-id). Visual drag-and-drop page builder UI is out of
  scope for this feature.
- **FR-009**: Pages MUST carry SEO fields (meta title, meta description,
  optional canonical path override) on draft and published snapshots.
- **FR-010**: Slugs MUST be unique within platform scope, URL-safe, and stable
  for public links after publish (slug changes on a published page require
  republish and MUST not leave two live public slugs for the same page).
- **FR-011**: All admin mutations MUST enforce authorization (fail closed),
  validation, and audit of create/update/publish/unpublish/archive/rollback.
- **FR-012**: System MUST support rollback by creating a new publication from a
  prior publication snapshot (append-only history).
- **FR-013**: Preview (P3) MUST use a secure, time-limited token and MUST NOT
  expose drafts on ordinary public endpoints.
- **FR-014**: Menus, banners, redirects, scheduled publish, vendor/store-scoped
  pages, and visual page-builder canvases are OUT OF SCOPE for this feature.

### Key Entities _(include if feature involves data)_

- **Page**: Platform content document with id, title, slug, status, draft body
  blocks, draft SEO, version, timestamps, archive flag.
- **PagePublication**: Immutable snapshot of title, slug, body, SEO, published
  at, actor, and page version at publish time; one current publication pointer
  per live page when status is PUBLISHED.
- **ContentBlock**: Typed block within body (heading, paragraph, markdown,
  image referencing a Media id).
- **PagePreviewToken** (P3): Short-lived capability bound to a page draft
  version for preview only.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An authorized admin can create a draft, publish it, and verify
  the public slug returns that content in under 5 minutes without developer
  intervention.
- **SC-002**: 100% of anonymous requests for draft-only or unpublished slugs
  return not found (zero draft field leakage in public responses).
- **SC-003**: Concurrent publish/update with a stale version is rejected
  (conflict) in automated tests; no silent last-write-wins on publish.
- **SC-004**: At least one focused automated test covers create→publish→public
  read and unpublish→public not found.
- **SC-005**: Storefront can link footer/legal pages to CMS slugs without
  hardcoding page HTML in the Next.js repo for those pages.

## Assumptions

- Admin Media Library already exists; image blocks reference media ids only.
- Scope is **platform** only for v1 (same audience as Website Control Center).
- Default locale only; multi-locale content is deferred.
- Body authoring in admin is form/structured-block editing, not a canvas
  builder (ponytail ceiling; upgrade path = later page-builder UI on the same
  block model).
- Preview tokens may ship after P1 publish/public read if time-boxed.
- Existing Identity permission patterns are extended with content-page
  permissions (or equivalent platform admin gates already used for Website).
- Redis may cache published-by-slug reads; PostgreSQL remains source of truth.
- Phase 20.3 checklist item for "CMS page builder" is satisfied for delivery
  purposes by this Pages vertical; a future feature may add the visual builder
  without replacing the Page/Publication model.
