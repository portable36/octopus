# Feature Specification: Visual CMS Page Builder

**Feature Branch**: `004-visual-page-builder`

**Created**: 2026-09-19

**Status**: Draft

**Input**: Grill decisions (Q1 A+B, Q2 A, Q3 B, Q4 A, Q5 A, Q6 A, Q7 A, Q8 A,
Q9 A, Q10 A, Q11 C, Q12 A) plus confirmed constraints: additive block schema,
no vendor/store pages, no freeform HTML/CSS, no nested sections.

Builds on `003-cms-pages` Page aggregate + draft→publish.

---

## User Scenarios & Testing

### User Story 1 - DnD block canvas on CMS pages (P1)

Platform admin edits a page with a vertical drag-and-drop block stack, sections
with 1–3 columns, and an in-admin draft preview using the same renderer as the
storefront.

### User Story 2 - Homepage body via reserved `home` (P1)

When a published page with slug `home` exists, storefront `/` renders its body
instead of theme hero/promo. Otherwise theme banners remain (Q11C).

### User Story 3 - Commerce embeds (P1)

Product and offer blocks store stable IDs. Publish validates via catalog ports;
storefront resolves live display data; unsellable/missing → hide/placeholder.

### Edge Cases

- Nested `section` rejected
- `javascript:` / non-https external button hrefs rejected
- Legacy heading/paragraph/markdown/image bodies still publish
- Unknown block types fail closed on publish

## Requirements

- **FR-001**: Additive ContentBlock types: section, button, product, offer
- **FR-002**: One-level sections only; leaves inside columns
- **FR-003**: `@dnd-kit` admin canvas; shared renderer
- **FR-004**: Reserved slug `home` for homepage body; theme chrome unchanged
- **FR-005**: Publish validates media + product/offer sellability
- **FR-006**: Platform-only authoring (`website.*`)
- **FR-007**: No freeform HTML/CSS; markdown remains plain text or sanitized

## Success Criteria

- **SC-001**: Admin can DnD-reorder blocks and preview draft without publish
- **SC-002**: Published `home` replaces theme hero/promo on `/`
- **SC-003**: Legacy 4-type pages still publish; nested section fails
- **SC-004**: Bad offer/product id fails publish

## Assumptions

- Theme Customizer hero/promo editors stay as fallback source
- No auto-migrate theme → home
- No public preview tokens; no category embeds; no nested sections
