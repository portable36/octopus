# Contract: CMS Pages API

**Feature**: `003-cms-pages` | **Base**: `/api/v1`

## Auth

| Surface | Auth                                    |
| ------- | --------------------------------------- |
| Admin   | Bearer access token + permissions below |
| Public  | Anonymous                               |

| Operation                      | Permission        |
| ------------------------------ | ----------------- |
| List / get                     | `website.read`    |
| Create / update / archive      | `website.update`  |
| Publish / unpublish / rollback | `website.publish` |

Errors use platform problem-details. Concurrency failures → **409** with code
`CONTENT_PAGE_VERSION_CONFLICT`.

---

## Admin

### `GET /admin/content/pages`

Query: `q?`, `status?` (`DRAFT|PUBLISHED|UNPUBLISHED`), `includeArchived?=false`,
`limit?`, `cursor?`

Response `200`:

```json
{
  "items": [
    {
      "id": "uuid",
      "title": "About",
      "slug": "about",
      "status": "PUBLISHED",
      "version": 3,
      "updatedAt": "ISO-8601",
      "archivedAt": null
    }
  ],
  "nextCursor": null
}
```

### `POST /admin/content/pages`

Body:

```json
{
  "title": "About",
  "slug": "about",
  "body": [],
  "seo": { "metaTitle": "About us", "metaDescription": "..." }
}
```

Response `201`: full admin page DTO (draft fields + status `DRAFT`, version `1`).

### `GET /admin/content/pages/:id`

Response `200`: admin page DTO including `draftBody`, `draftSeo`,
`currentPublication` summary if any.

### `PATCH /admin/content/pages/:id`

Body (all optional except concurrency):

```json
{
  "expectedVersion": 1,
  "title": "...",
  "slug": "...",
  "body": [{ "type": "paragraph", "text": "Hello" }],
  "seo": { "metaTitle": "..." }
}
```

Response `200`: updated admin DTO. Does not change published snapshot.

### `POST /admin/content/pages/:id/archive`

Body: `{ "expectedVersion": n }`  
Response `200`: page archived; if was PUBLISHED, behaves as unpublished for
public.

### `POST /admin/content/pages/:id/publish`

Body: `{ "expectedVersion": n }`  
Response `200`: status `PUBLISHED`, new publication id, incremented version.

Rejects if body empty, slug invalid/duplicate against another live page, or
referenced media not ready.

### `POST /admin/content/pages/:id/unpublish`

Body: `{ "expectedVersion": n }`  
Response `200`: status `UNPUBLISHED`, `currentPublicationId` cleared.

### `GET /admin/content/pages/:id/publications`

Response `200`: `{ "items": [ { "id", "title", "slug", "pageVersion", "publishedAt", "publishedBy" } ] }`

### `POST /admin/content/pages/:id/rollback`

Body: `{ "expectedVersion": n, "publicationId": "uuid" }`  
Response `200`: new publication created from snapshot; status `PUBLISHED`.

---

## Public

### `GET /storefront/content/pages/:slug`

Response `200`:

```json
{
  "id": "page-uuid",
  "publicationId": "uuid",
  "title": "About",
  "slug": "about",
  "body": [{ "type": "paragraph", "text": "..." }],
  "seo": { "metaTitle": "...", "metaDescription": "..." },
  "publishedAt": "ISO-8601"
}
```

Response `404` if not currently published / archived / unknown slug.

No draft fields ever appear.
