# Data Model: CMS Pages

**Feature**: `003-cms-pages` | **Date**: 2026-09-18

## Entities

### Page (`content_pages`)

| Column                  | Type             | Notes                                              |
| ----------------------- | ---------------- | -------------------------------------------------- |
| id                      | uuid PK          |                                                    |
| title                   | varchar(200)     | draft title                                        |
| slug                    | varchar(200)     | unique among non-archived; URL-safe                |
| status                  | varchar(32)      | `DRAFT` \| `PUBLISHED` \| `UNPUBLISHED`            |
| draft_body              | jsonb            | `ContentBlock[]`                                   |
| draft_seo               | jsonb            | `{ metaTitle?, metaDescription?, canonicalPath? }` |
| version                 | int              | optimistic concurrency; starts at 1                |
| current_publication_id  | uuid NULL        | FK to publications when PUBLISHED                  |
| archived_at             | timestamptz NULL | soft archive                                       |
| created_at / updated_at | timestamptz      |                                                    |
| created_by / updated_by | uuid NULL        | actor ids                                          |

**Invariants**:

- Slug unique where `archived_at IS NULL`.
- Status `PUBLISHED` iff `current_publication_id` points to a row for this page.
- Draft fields may diverge from current publication until publish.

### PagePublication (`content_page_publications`)

| Column                | Type         | Notes                        |
| --------------------- | ------------ | ---------------------------- |
| id                    | uuid PK      |                              |
| page_id               | uuid FK      |                              |
| title                 | varchar(200) | snapshot                     |
| slug                  | varchar(200) | snapshot (public lookup key) |
| body                  | jsonb        | snapshot blocks              |
| seo                   | jsonb        | snapshot                     |
| page_version          | int          | page.version at publish time |
| published_at          | timestamptz  |                              |
| published_by          | uuid NULL    |                              |
| source_publication_id | uuid NULL    | set on rollback              |

**Invariants**:

- Rows are immutable after insert.
- Public resolve: join/page where status=PUBLISHED and publication.slug = :slug
  and page.archived_at IS NULL.

### ContentBlock (JSON shape, not a table)

```json
[
  { "type": "heading", "level": 2, "text": "..." },
  { "type": "paragraph", "text": "..." },
  { "type": "markdown", "markdown": "..." },
  { "type": "image", "mediaId": "uuid", "alt": "..." }
]
```

## RLS

Platform content: enable RLS consistent with other platform tables (admin role /
service role policies used elsewhere). Public API uses service connection that
already scopes reads through application queries (published-only filter), not
end-user JWT claims on the page row.

## Indexes

- unique partial index on `content_pages(slug) WHERE archived_at IS NULL`
- index on `content_page_publications(slug, published_at DESC)`
- index on `content_page_publications(page_id, published_at DESC)`

## Migration

Additive migration only. No changes to settings or media schemas.
