# Architecture-gap analysis — Google / GTM / SEO / Meta measurement

**Command status:** Phase **18.6** measurement path partially shipped (consent, public config, attribution, marketing module + outbox delivery). SEO / Ads ROAS / Phase 21 dashboards remain open.

**ORM:** MikroORM + SQL migrations — **not Prisma**.

**Truth:** PostgreSQL domain. GA4 / GTM / Meta / Ads / GSC = sinks only.

Canonical plan: [marketing.md](../module/marketing.md) · PHASES **18.6** / **18.5** / **21**.

---

## Inspection matrix (1–26)

| #     | Area                        | State                                                                            | Reuse / gap                                            |
| ----- | --------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 1     | Next.js storefront          | **Present** — `(storefront)` + ConsentManager / TrackingService                  | Continue polish                                        |
| 2     | Admin dashboard             | Thin shell + `/admin/system/marketing`                                           | Deeper Marketing IA later                              |
| 3–5   | Catalog / Product / Variant | **Present** — SKU VO, offers, events → `catalog_outbox`                          | `item_id` = variantId until Order line stores SKU      |
| 6     | Category                    | **Present** — includes `CategorySeo` in domain types                             | Extend; don’t invent parallel SEO tables blindly       |
| 7     | Brand                       | **Doc/brandId only** — no Brand aggregate/module in `backend/src`                | Brand SEO/pages deferred or minimal `brandId` string   |
| 8–9   | Vendor / Store              | **Present** + tenancy headers                                                    | Store-scoped marketing config                          |
| 10    | Customer                    | Module present                                                                   | Consent prefs with Identity/Customer                   |
| 11–12 | Cart / Checkout             | **API + UX present**; attribution on submit                                      | Fire tracking **after** API success                    |
| 13    | Order                       | Aggregate + `OrderPaid` + **`order_outbox`**                                     | **Fixed**                                              |
| 14–16 | Payment / COD / Refund      | Outboxed (`CodCollected`, `RefundCompleted`) → marketing handler                 | COD purchase = collect only; refund → GA4/Meta         |
| 17    | Inventory                   | Outboxed; search availability hook                                               | Feed availability only                                 |
| 18–19 | Outbox / BullMQ             | `octopus.marketing` worker wired                                                 | Prefer marketing queue (done)                          |
| 20    | Settings                    | `general` \| `branding` \| **`marketing`**                                       | **Fixed**; secrets server-only via public config strip |
| 21    | SEO                         | Category SEO fields; Phase **18.5** checklist open; no sitemap/robots app routes | Keyword admin = later                                  |
| 22–24 | Meta / analytics / GTM      | TrackingService + GA4 MP / Meta CAPI adapters                                    | Browser Pixel via GTM; server CAPI/MP                  |
| 25    | Domain events               | Marketing consumes outboxed facts                                                | **Fixed**                                              |
| 26    | API client                  | `frontend/src/lib/api-client.ts` + `marketing-api.ts`                            | Public marketing config endpoint                       |

---

## What already exists (do not duplicate)

- Outbox + dispatcher + Redis NX dedupe + DLQ pattern
- Payment path → `CodCollected` consumer (ledger) — marketing purchase wired
- Settings scoped documents + `marketing` key
- Search indexing worker pattern (parallel for CAPI/MP)
- Notification module (consent gate)
- Variant SKU as stable commerce identifier (order lines still expose variantId)

---

## What is missing (must build — phased)

| Capability                                                | Gap                            | Slice      |
| --------------------------------------------------------- | ------------------------------ | ---------- |
| GTM + dataLayer                                           | Shipped (M4 baseline)          | M4         |
| GA4 browser + MP                                          | MP + public IDs shipped        | M1 + M3–M4 |
| Google Ads                                                | No offline conversion push yet | M2 + M3    |
| Search Console                                            | No integration                 | M8         |
| SEO keywords                                              | No registry; CategorySeo only  | 18.5 + M8  |
| UTM / gclid / fbclid                                      | **Fixed** on checkout          | M2         |
| Meta Pixel / CAPI                                         | CAPI + Pixel ID shipped        | M3–M5      |
| Marketing event log                                       | `marketing_events` table       | M3 + M6    |
| Funnel / product / campaign / store / vendor analytics UI | Phase 21 first-party           | M7         |
| Admin marketing settings                                  | Thin `/admin/system/marketing` | M6         |
| Consent-aware tracking                                    | ConsentManager shipped         | M1         |
| Debug mode                                                | None                           | M4/M6      |

---

## Hard prerequisites before coding tags

1. ~~Phase 18.1–18.3 — public pages + cart/checkout UX~~ (done)
2. ~~Order outbox~~ (done)
3. ~~17.2 marketing preference / consent~~ (baseline done)
4. ~~Queue name: `octopus.marketing`~~ (done)

---

## Target abstraction (when implementing)

```text
ConsentManager → TrackingService → dataLayer (GTM) → GA4 / Ads / Meta (browser)

Domain (paid/collected/refunded)
  → order_outbox / payment outbox → BullMQ → MarketingProcessor / DomainEventsProcessor
  → GA4 MP + Meta CAPI
```

Rules already locked in [marketing.md](../module/marketing.md): no secrets in browser; COD ≠ purchase until collected; `transaction_id` = order number; multi-store config resolution.

---

## Implementation gate

M0–M4 baseline is in tree. Remaining: Ads offline, Meta catalog feed, deeper admin Marketing IA, Phase 21 first-party dashboards, SEO keywords/GSC (M8).
