# Architecture-gap analysis — Google / GTM / SEO / Meta measurement

**Command status:** inspection complete. **No implementation in this pass** (storefront + order outbox + consent are missing blockers).

**ORM:** MikroORM + SQL migrations — **not Prisma**.

**Truth:** PostgreSQL domain. GA4 / GTM / Meta / Ads / GSC = sinks only.

Canonical plan: [marketing.md](./marketing.md) · PHASES **18.6** / **18.5** / **21**.

---

## Inspection matrix (1–26)

| #     | Area                        | State                                                                            | Reuse / gap                                                        |
| ----- | --------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1     | Next.js storefront          | **Missing** — admin App Router only; no `(storefront)`                           | Blocker for GTM/Pixel/ConsentManager                               |
| 2     | Admin dashboard             | Thin shell (vendors/stores/health/POS)                                           | Add Marketing settings later; routes stubbed in admin-dashboard.md |
| 3–5   | Catalog / Product / Variant | **Present** — SKU VO, offers, events → `catalog_outbox`                          | `item_id` = variant SKU                                            |
| 6     | Category                    | **Present** — includes `CategorySeo` in domain types                             | Extend; don’t invent parallel SEO tables blindly                   |
| 7     | Brand                       | **Doc/brandId only** — no Brand aggregate/module in `backend/src`                | Brand SEO/pages deferred or minimal `brandId` string               |
| 8–9   | Vendor / Store              | **Present** + tenancy headers                                                    | Store-scoped marketing config                                      |
| 10    | Customer                    | Phase **18.1** planned — not a full Customer module yet                          | Consent prefs with Identity/Customer                               |
| 11–12 | Cart / Checkout             | **API present** (guest cart, COD checkout)                                       | Fire tracking **after** API success                                |
| 13    | Order                       | Aggregate + `OrderPaid` events                                                   | **No `order_outbox`** — critical gap                               |
| 14–16 | Payment / COD / Refund      | Outboxed (`CodCollected`, `RefundCompleted`)                                     | COD purchase = collect only; refund → GA4/Meta                     |
| 17    | Inventory                   | Outboxed; search availability hook                                               | Feed availability only                                             |
| 18–19 | Outbox / BullMQ             | Mature; `octopus.analytics` **reserved unused**                                  | Prefer `octopus.marketing` or reclaim analytics deliberately       |
| 20    | Settings                    | `general` \| `branding` only, platform/vendor/store                              | Extend key `marketing` + secrets pattern                           |
| 21    | SEO                         | Category SEO fields; Phase **18.5** checklist open; no sitemap/robots app routes | Keyword admin = later                                              |
| 22–24 | Meta / analytics / GTM      | **Zero** code (`dataLayer`/`fbq`/`gtag` absent)                                  | Greenfield TrackingService                                         |
| 25    | Domain events               | Rich; marketing must consume outboxed facts                                      | Wire OrderPaid into outbox first                                   |
| 26    | API client                  | `frontend/src/lib/api-client.ts` fetch wrapper                                   | Public marketing config endpoint                                   |

---

## What already exists (do not duplicate)

- Outbox + dispatcher + Redis NX dedupe + DLQ pattern
- Payment path → `CodCollected` consumer (ledger) — extend for marketing purchase
- Settings scoped documents
- Search indexing worker pattern (parallel for CAPI/MP)
- Notification module (consent gate lands in 17.2)
- Variant SKU as stable commerce identifier

---

## What is missing (must build — phased)

| Capability                                                | Gap                             | Slice      |
| --------------------------------------------------------- | ------------------------------- | ---------- |
| GTM + dataLayer                                           | No storefront / TrackingService | M4         |
| GA4 browser + MP                                          | No IDs, no worker               | M1 + M3–M4 |
| Google Ads                                                | No gclid capture / conversions  | M2 + M3    |
| Search Console                                            | No integration                  | M8         |
| SEO keywords                                              | No registry; CategorySeo only   | 18.5 + M8  |
| UTM / gclid / fbclid                                      | No order attribution            | M2         |
| Meta Pixel / CAPI                                         | None                            | M3–M5      |
| Marketing event log                                       | None                            | M3 + M6    |
| Funnel / product / campaign / store / vendor analytics UI | Phase 21 first-party            | M7         |
| Admin marketing settings                                  | None                            | M6         |
| Consent-aware tracking                                    | No ConsentManager; 17.2 open    | M1         |
| Debug mode                                                | None                            | M4/M6      |

---

## Hard prerequisites before coding tags

1. **Phase 18.1–18.3** — public pages + cart/checkout UX
2. **Order outbox** (or marketing rows written in same TX as OrderPaid / paid payment)
3. **17.2** marketing preference / consent
4. Decide queue name: `octopus.marketing` vs reuse `octopus.analytics`

---

## Target abstraction (when implementing)

```text
ConsentManager → TrackingService → dataLayer (GTM) → GA4 / Ads / Meta (browser)

Domain (paid/collected/refunded)
  → marketing_outbox → BullMQ → MarketingWorker
  → GA4 MP + Meta CAPI (+ Ads offline)
```

Rules already locked in [marketing.md](./marketing.md): no secrets in browser; COD ≠ purchase until collected; `transaction_id` = order number; multi-store config resolution.

---

## Implementation gate

**Do not start M3–M8 until M0–M2 prerequisites exist.**  
Next executable work if forced early: **M1 public config schema only** (no Pixel load) — still prefer **17.2 / 18.1 / order outbox** first.

After a real implementation pass, report the command’s items 1–14 (files, DB, APIs, events, queues, settings, dataLayer, GA4, Ads, Meta, SEO, attribution, tests, risks).
