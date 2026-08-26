# Architecture-gap analysis — Automated SEO Engine

Status: **analysis only** — do **not** implement the full engine in one pass.  
ORM: **MikroORM + SQL migrations** (not Prisma).  
Truth: **Catalog / Inventory / Order / Store domains** — Search Console, GA4, Meta, Meilisearch are **sinks / signals only**.

Canonical placement:

| Slice                                                                  | Where                                                              |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Serve metadata, canonical, sitemap, robots, Product/Breadcrumb JSON-LD | **Phase 18.5** (after 18.1–18.2 public URLs)                       |
| Templates, overrides, redirects, slug history, health basics           | **SEO module** — start with 18.5 skeleton; deepen after storefront |
| Keywords, mapping, opportunities, GSC                                  | **M8** (after 18.5; see [marketing.md](../module/marketing.md))    |
| CMS landing pages / SEO center UI                                      | **Phase 20.3** (+ deferred “SEO center”)                           |
| AI SEO drafts                                                          | Optional port **after** rule engine + approval workflow            |

Related: [PHASES.md](../PHASES.md) §18.5 · [marketing.md](../module/marketing.md) · [catalog.md](../module/catalog.md) · [marketing-gap-analysis.md](./marketing-gap-analysis.md).

---

## Verdict

**Fit: yes**, as a **phased, rule-driven SEO bounded context** — **not** as a big-bang “SEO Automation Worker that publishes everything.”

## Hard blockers (historical — see PHASES 18.x)

1. ~~No public storefront~~ — **18.2 shipped**
2. Product public slug still derived (`slugify(name)`); durable slug + 301 history remains **P2**
3. No Brand aggregate — `/brands/{slug}` still blocked
4. No customer product reviews — AggregateRating stays off
5. Settings has no `seo` namespace yet — templates deferred to P2
6. Internal search → opportunity engine still needs analytics (P4)

**P1 (18.5) shipped:** Next metadata/canonical/OG, Product+Breadcrumb JSON-LD (no ratings), `robots.ts` blocks private paths, `sitemap.xml` from categories + `GET /public/sitemap/products` (catalog DB, not Meili), facet querystrings `noindex` with clean canonical.

---

## Inspection matrix (command checklist)

| #   | Area                 | Repo state                                                               | Implication for SEO                                                          |
| --- | -------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| 1   | Catalog module       | **Present** — products, variants, categories, store offers, RLS          | Authoritative for names, categories, offers                                  |
| 2   | Product              | **Present** — lifecycle, description, `brandId`; **no slug, no SEO VO**  | Need product URL strategy + optional SEO override table                      |
| 3   | ProductVariant       | **Present** — SKU, options, media refs                                   | Facets/variants → canonical rules; do not index every `?color=`              |
| 4   | Category             | **Present** — tree, **slug**, **CategorySeo** (`title`/`description`)    | Reuse; do not duplicate into parallel category SEO rows blindly              |
| 5   | Brand                | **Missing aggregate** — `brandId` only; admin nav stub `/catalog/brands` | Brand SEO deferred until Brand BC exists                                     |
| 6   | Vendor               | **Present** — ownership, lifecycle                                       | Vendor SEO isolation via existing authz patterns                             |
| 7   | Store                | **Present** — **slug** per vendor; no store SEO fields                   | Store SEO config later; multi-store absolute canonical needs public base URL |
| 8   | Customer             | **Thin / Phase 18.1**                                                    | Not SEO-critical except future account `noindex`                             |
| 9   | Reviews              | **Absent** (returns “review” ≠ product reviews)                          | **Never** emit fake ratings/reviews                                          |
| 10  | Inventory            | **Present** — reservations, availability ports                           | JSON-LD availability from inventory rules, not UI guesses                    |
| 11  | Order                | **Present**                                                              | Not SEO truth; conversion signals only for opportunities (later)             |
| 12  | Search / Meilisearch | **Present** — offer index, public search API, reindex                    | **Not** crawl index; do not treat Meili docs as sitemap source of truth      |
| 13  | Outbox               | **Present** — `catalog_outbox`, payment/fulfillment/inventory outboxes   | Reuse: Product\* / Category\* / Offer\* → SEO jobs                           |
| 14  | BullMQ               | **Present** — `octopus.domain-events`, `notification`, `search-indexing` | Add `octopus.seo` (or sibling) — do not invent a second broker               |
| 15  | Media                | **Present (metadata)** — upload pipeline incomplete                      | Image alt / WebP: integrate when media pipeline matures; don’t fake CDN      |
| 16  | Frontend routing     | **`(storefront)`** browse + cart/account (18.2–18.4)                     | SEO serving on live routes (18.5)                                            |
| 17  | Next.js metadata     | **`generateMetadata`**, `sitemap.ts`, `robots.ts`, JSON-LD (18.5)        | Deepen with SEO module projections (P2)                                      |
| 18  | Admin dashboard      | Planned SEO-ish under content/marketing; **no SEO center**               | Don’t invent full `/seo/*` tree until 18.5+ APIs exist                       |
| 19  | Existing SEO         | **Category SEO only**                                                    | Manual override pattern already exists for categories                        |
| 20  | Settings             | `general` \| `branding` only                                             | Add `seo` key later (templates, robots defaults, automation toggles)         |
| 21  | GTM/GA4/Meta         | **Planned** (18.6 / marketing.md)                                        | Orthogonal to technical SEO; GSC = M8 signal, never truth                    |
| 22  | Domain events        | Catalog events outboxed for search; CategorySeoUpdated exists            | Wire SEO worker beside search indexer; keep handlers thin                    |

---

## What already exists (reuse)

```text
Catalog domain
  ├── Category.slug + CategorySeo (manual fields)
  ├── Product / Variant / StoreOffer (+ catalog_outbox)
  └── Events → OutboxDispatcher → BullMQ (search-indexing today)

Store.profile.slug
Media asset metadata (alt may exist or be addable later)
Messaging QUEUE_NAMES + OutboxDispatcher routing
Notification / Search worker patterns (idempotent Redis NX)
```

**Do not create:** a second product table, a second outbox bus, Prisma models, or browser→Meilisearch SEO crawls.

---

## Proposed SEO module (target shape — phased)

Centralize **derived / override / crawl** concerns. Catalog remains authoritative for product facts.

```text
SEO Module (backend)
├── Configuration (templates, automation flags, facet indexability rules)
├── Metadata resolution (priority chain)
├── Slug / URL history + Redirect manager
├── Canonical + robots policy
├── Structured data builders (fact-gated)
├── Sitemap projection (incremental)
├── Keyword / page-target (later)
├── Landing page suggestions (later; admin approve)
├── Analyzer / health / score (later)
├── Audit log
└── SEO worker (BullMQ octopus.seo)
```

**Resolution priority (non-negotiable):**

```text
Manual override → AI draft (approved only) → Template → System fallback
```

Automated jobs **must not** overwrite manual fields. AI **never** publishes without validator + approval when configured.

---

## Metadata priority vs current code

| Entity   | Manual today                   | Template / AI / sitemap          |
| -------- | ------------------------------ | -------------------------------- |
| Category | `seo_title`, `seo_description` | Missing                          |
| Product  | None                           | Missing (fallback = name)        |
| Store    | None                           | Missing (fallback = displayName) |
| Brand    | N/A                            | Blocked on Brand BC              |

---

## Event / queue design (when implementing)

Reuse catalog outbox — **do not** make product HTTP wait on SEO:

```text
ProductCreated / ProductUpdated / Category* / StoreOffer* / InventoryChanged*
  → catalog_outbox / inventory_outbox (existing)
  → OutboxDispatcher
  → octopus.seo
  → regenerate metadata projection / invalidate / sitemap delta
```

Idempotency: same pattern as search-indexing (`outboxId` Redis NX + deterministic document keys).

Suggested jobs (names illustrative): `seo.generate-product`, `seo.generate-category`, `seo.update-sitemap`, `seo.analyze-page` — **enable only those that have real page URLs**.

---

## Phased delivery (ponytail)

### P0 — Prerequisites (not SEO module)

- **18.1** Public catalog APIs + published-only + store-by-slug
- **18.2** Storefront routes (PDP/PLP/category)
- Product **public slug** (or offer-centric URL strategy) + **slug change → 301 history** policy decided before mass indexation

### P1 — Phase 18.5 “SEO serve” (minimum shippable)

- Nest (or BFF) **resolved SEO document** for product/category/store: title, description, canonical, OG basics
- Next `generateMetadata` + Product/Breadcrumb JSON-LD **only with real data**
- `robots.ts` defaults: block `/admin`, `/account`, `/cart`, `/checkout`, `/vendor`
- Sitemap index from **DB projection of indexable URLs** (not Meili dump)
- Facet rule v0: filter querystrings **noindex** or canonical to clean category URL
- Category: respect existing manual SEO; template fill only when null
- **No** AI, **no** keyword registry, **no** auto landing pages, **no** AggregateRating

### P2 — SEO module core

- `seo_overrides` / resolved cache tables with `source` + audit
- Template engine in Settings (`seo` key)
- Redirect + slug history (no chains)
- Store SEO fields + absolute canonical host per store/platform
- Safe auto-fixes only (missing fallback title/description/canonical)

### P3 — Health + score

- Scanner issues with severity, entity, URL, fix eligibility
- Transparent score breakdown (not a vanity single number without reasons)

### P4 — Keywords / opportunities / GSC (M8)

- Candidate keywords ≠ approved targets
- Primary-keyword uniqueness constraint
- Internal search query analytics (new) + optional GSC import
- Opportunities UI: **no fabricated volume**

### P5 — Landing pages / AI

- Admin-approved collections only; automation thresholds configurable and off by default
- AI port: draft → validate (facts, length, claims denylist, duplicate) → REVIEW → PUBLISH

---

## Spec feature → disposition

| Spec area                                                 | Disposition                                              |
| --------------------------------------------------------- | -------------------------------------------------------- |
| Metadata / titles / descriptions / OG / Twitter           | **P1–P2**                                                |
| Slugs + history + redirects + canonical                   | **P0 URL policy + P1–P2**                                |
| Product/Category/Brand/Store SEO                          | Category partial; Product/Store P1–P2; Brand **blocked** |
| Structured data Product/Offer/Breadcrumb                  | **P1** fact-gated                                        |
| AggregateRating / Review                                  | **Blocked** until Reviews BC                             |
| Sitemap / robots                                          | **P1**                                                   |
| Faceted navigation rules                                  | **P1** (strict noindex default)                          |
| Keyword manager / intent / mapping                        | **P4**                                                   |
| Internal search → opportunities                           | **P4** (needs query log)                                 |
| Landing pages + auto suggestions                          | **P5** / 20.3; never mass-publish                        |
| Internal linking engine                                   | Light in P1 (category/brand crumbs); full engine later   |
| Image SEO / media pipeline                                | Align with Media rules; partial alt in P2                |
| Health / score / duplicate / thin / orphan / broken links | **P3** (broken links need storefront link graph)         |
| AI generation                                             | **P5** foundation only                                   |
| Search Console                                            | **P4** port; never source of truth                       |
| Vendor vs platform SEO isolation                          | Authz from day one of SEO writes                         |
| Approval workflow + audit                                 | Audit from P2; AI approval P5                            |

---

## Explicit non-goals / forbidden

- Inventing prices, availability, ratings, reviews, shipping, discounts, “best price” claims
- Overwriting manual SEO
- Keyword stuffing / dumping all candidates into copy
- Auto-creating thousands of thin `/collections/*` pages
- Silent slug changes without redirects; redirect chains; all deletes → homepage
- Putting cart/checkout/account/admin/vendor URLs in public sitemaps
- Using GA4/GSC/Meili as commerce or catalog truth
- Implementing Prisma or a parallel Catalog

---

## Multi-store / multi-vendor notes

- Indexable URL and absolute canonical must encode **which public host** (platform vs store subdomain) — decide with 18.1 public routing.
- Vendor may edit SEO only for **owned** products/categories (as allowed); never platform robots/global sitemap rules.
- Duplicate manufacturer copy across vendors: **flag**, don’t auto-rewrite.

---

## Inventory / lifecycle SEO rules (when P1+)

| State                  | Suggested default                                                   |
| ---------------------- | ------------------------------------------------------------------- |
| DRAFT / pending_review | noindex, omit from sitemap                                          |
| published + in stock   | indexable (if other quality rules pass)                             |
| out of stock           | remain indexable unless policy says otherwise; reflect availability |
| discontinued           | 301 to replacement or category — **not** homepage by default        |
| deleted / archived     | 301 or 410 per policy; audit                                        |

---

## Tests (when a slice ships)

- Priority chain (manual wins)
- No false claims in description generator
- Slug normalize + change creates redirect; no chains
- JSON-LD omits rating when no reviews
- Availability matches inventory port
- Sitemap excludes private paths
- Concurrent SEO jobs idempotent
- Vendor cannot PATCH another vendor’s override

Full E2E SEO crawls wait until storefront exists.

---

## Recommended next engineering step

1. Finish **Phase 18.1–18.2** (or the smallest public PDP/category path).
2. Decide **product URL strategy** (product slug vs store-offer slug) + redirect policy.
3. Implement **18.5 P1** only (resolve + serve + sitemap/robots + fact-gated JSON-LD).
4. Document module at `docs/module/seo.md` when P1 lands.
5. Defer keyword/AI/GSC/landing-page factory until M8 / 20.3.

**Do not** open a mega-PR for the entire Automated SEO Engine before P0 URLs exist.

---

## Report stub (fill after a real implementation pass)

1. Files changed
2. Database changes
3. SEO entities
4. SEO events
5. Queue jobs
6. API endpoints
7. Admin pages
8. Frontend SEO implementation
9. Structured data
10. Sitemap architecture
11. Robots architecture
12. Redirect architecture
13. Keyword architecture
14. AI architecture
15. Tests
16. Remaining risks
