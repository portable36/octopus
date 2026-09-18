# Quickstart: CMS Pages

**Feature**: `003-cms-pages`

## Prerequisites

- Backend + frontend running (local compose or `npm.cmd run` scripts).
- Platform admin user with `website.read`, `website.update`, `website.publish`.
- (Optional) Admin Media Library asset ready for an image block.

## Happy path

1. Admin → **Website / Content → Pages** → Create page `About` / slug `about`.
2. Add a paragraph block; Save (stays DRAFT).
3. Open `/pages/about` on storefront → expect not found.
4. Publish.
5. Open `/pages/about` → see published content; document title uses SEO meta title
   when set.
6. Edit draft text; Save without publish → storefront still shows old text.
7. Publish again → storefront updates.
8. Unpublish → storefront not found; admin can still edit.

## API smoke (curl)

```bash
# after obtaining admin access token
curl -s -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"About","slug":"about","body":[{"type":"paragraph","text":"Hi"}],"seo":{}}' \
  http://localhost:3001/api/v1/admin/content/pages

curl -s -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"expectedVersion":1}' \
  http://localhost:3001/api/v1/admin/content/pages/$PAGE_ID/publish

curl -s http://localhost:3001/api/v1/storefront/content/pages/about
```

## Automated check

Run the focused content-page test file added in implementation (create → publish →
public read → unpublish → 404). Then `npm.cmd run validate` from repo root.
