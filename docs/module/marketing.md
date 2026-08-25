# Marketing & measurement

Status: **planned** — not shipped.  
Fit: **yes**, as a phased measurement layer after storefront + consent.  
Truth: **PostgreSQL domain** (not MySQL). GA4 / GTM / Meta / Ads / Search Console are **read/analytics sinks only**.

Canonical roadmap: **Phase 18.6** (tags + attribution + server purchase) → **Phase 21** (first-party funnels/revenue dashboards) → SEO admin depth with **18.5 / 20.3**.

Inspection checklist (exists vs missing): [marketing-gap-analysis.md](../engineering/marketing-gap-analysis.md).

---

## Objective (scoped)

Reliable **first-party commerce events** + optional third-party delivery:

| Layer                          | Role                                                         |
| ------------------------------ | ------------------------------------------------------------ |
| Domain / Order / Payment       | Source of truth for money, stock, customers                  |
| `TrackingService` (storefront) | One dataLayer / Pixel entrypoint — no per-component DIY      |
| GTM                            | Tag orchestration (GA4, Ads, Meta tags)                      |
| GA4 MP + Meta CAPI             | Server backup for `purchase` / `refund` via outbox           |
| Admin Marketing settings       | IDs + secrets (secrets never to browser)                     |
| Phase 21 read models           | Funnel / AOV / acquisition from **our** orders + attribution |

Do **not** use GA4 numbers as accounting.

---

## Architecture

Target flow (Phase 18.6+). **Domain DB remains truth** — nothing below mutates orders/payments.

```text
                    CUSTOMER
                       │
                       ↓
              Next.js Storefront
              (ConsentManager first)
                       │
         ┌─────────────┴─────────────┐
         ↓                           ↓
   TrackingService              Commerce APIs
   → dataLayer / GTM            (cart / checkout / pay)
         │                           │
   ┌─────┼─────┐                     │ success + event_id
   ↓     ↓     ↓                     ↓
 GA4  Google  Meta              Domain TX + outbox
(via   Ads   Pixel              (OrderPaid / CodCollected /
 GTM) (tag)  (tag)               RefundCompleted / …)
                                         │
                                         ↓
                                  marketing_outbox
                                         ↓
                               BullMQ octopus.marketing
                                         │
                       ┌─────────────────┼─────────────────┐
                       ↓                 ↓                 ↓
                 GA4 Measurement    Meta Conversions   Google Ads
                 Protocol (MP)      API (CAPI)         (offline /
                                                       enhanced later)
```

| Label in some drafts | Correct Octopus name                                                                                                  |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| “Tracking API”       | Nest commerce APIs + optional public marketing config / `event_id` on responses — **not** a second source of purchase |
| “GA4 CAPI”           | **GA4 Measurement Protocol** (MP). “CAPI” = Meta only                                                                 |
| Browser Meta         | Pixel (via GTM or TrackingService)                                                                                    |
| Server Meta          | Conversions API                                                                                                       |

Browser path is best-effort; server path is durable. Same `event_id` / `transaction_id` for dedupe.

**COD:** soft funnel events at checkout OK; authoritative `purchase` only on **`CodCollected`** (same as ledger).

**IDs:** `item_id` / Meta `content_ids` = **variant SKU**. Meilisearch `offerId` is unrelated.

---

## Prerequisites / gaps

| Gap                                | Why it blocks                                       |
| ---------------------------------- | --------------------------------------------------- |
| Phase 18 storefront                | Nowhere to load GTM / ConsentManager                |
| Phase 17.2 preferences             | Marketing consent                                   |
| **Order outbox missing**           | `OrderPaid` exists on aggregate but is not outboxed |
| Settings only `general`/`branding` | Need `marketing` (+ encrypted secrets)              |
| No attribution on orders           | UTM / gclid / fbclid snapshot at checkout           |

ORM: MikroORM + SQL migrations (not Prisma).

---

## Admin settings (target IA)

```text
Settings → Marketing
  ├── Meta          (Pixel, CAPI token masked, test code, store, env)
  ├── Google Analytics (GA4 measurement ID, MP secret server-only)
  ├── Google Tag Manager (container ID GTM-…, enabled, env, store)
  ├── Google Ads    (conversion IDs; purchase primary)
  ├── Search Console (verification / API creds server-side)
  ├── SEO           (templates; deep keyword admin → later)
  ├── Attribution
  └── Consent
```

Environments: **dev / staging / production** — never mix production property IDs with staging traffic.

Public config API returns: GTM ID, GA4 ID, Meta Pixel ID, enabled flags. **Never** CAPI token, MP API secret, Ads secrets.

---

## GTM + dataLayer

- Container ID from settings — **not** hard-coded in components.
- Central `TrackingService.pushEcommerce(event, payload)` builds GA4 ecommerce shape (`currency`, `value`, `items[]` with SKU `item_id`).
- Only events that exist in the product (no wishlist until wishlist ships).

Purchase: totals from **backend order** (`transaction_id` = order number). Client must not invent value/tax/shipping. Dedupe: same `transaction_id` + app-side “purchase already sent” for success-page refresh.

---

## Server-side GA4 / Meta

| Browser           | Server                      |
| ----------------- | --------------------------- |
| GTM → GA4 / Pixel | Outbox → GA4 MP + Meta CAPI |

Shared `event_id` / `transaction_id` for dedupe. Retry + DLQ; audit rows in `marketing_events`.

Google Ads: prepare conversion + capture `gclid`/`gbraid`/`wbraid`; purchase value from order. ROAS only when ad spend is imported.

---

## Attribution

`MarketingAttribution` (session) + **order snapshot** at checkout:

`utm_*`, `gclid`/`wbraid`/`gbraid`, `fbclid`, first-touch + last-touch, landing, referrer — no unnecessary PII.

---

## SEO (split ownership)

Full inspection: [seo-gap-analysis.md](../engineering/seo-gap-analysis.md).

| Slice                                                       | Where                                                    |
| ----------------------------------------------------------- | -------------------------------------------------------- |
| Metadata, sitemap, robots, JSON-LD                          | Phase **18.5**                                           |
| Keyword registry, cannibalization rules, GSC performance UI | After storefront indexable URLs; credentials server-side |
| Thin autogenerated SEO pages                                | **Forbidden**                                            |

Do not stuff keywords into product copy. Do not claim rankings without GSC (or similar) data.  
Rule-based SEO first; AI drafts never publish without validation + approval.

---

## First-party analytics dashboards (Phase 21)

Visitors/sessions from GA import **or** first-party beacons later.  
**Orders, revenue, AOV, refunds, net sales** = domain/reporting read models.

Funnel and store/vendor/product performance: authorize vendor to **own data only**.  
Campaign ROAS: require spend — never revenue÷null.

---

## Incremental implementation plan

| Slice  | Content                                                                     | When                         |
| ------ | --------------------------------------------------------------------------- | ---------------------------- |
| **M0** | This plan + PHASES                                                          | Done                         |
| **M1** | Consent + public marketing config (GTM/GA4/Pixel IDs)                       | With 17.2 / 18.1             |
| **M2** | Order outbox + attribution snapshot on checkout                             | Before server purchase       |
| **M3** | `marketing` module + outbox worker (GA4 MP + Meta CAPI for purchase/refund) | After M2; COD=`CodCollected` |
| **M4** | Storefront TrackingService + GTM + ConsentManager                           | After 18.2–18.3              |
| **M5** | Meta catalog feed (SKU)                                                     | After public PDP URLs        |
| **M6** | Admin Marketing settings UI + event audit                                   | With M3–M4                   |
| **M7** | Phase 21 acquisition/funnel/AOV from orders+attribution                     | After volume                 |
| **M8** | SEO keywords + GSC                                                          | After 18.5                   |

**Explicitly deferred:** vendor-owned tags, fake ROAS, wishlist/Lead events before features, staging→prod property bleed, keyword stuffing.

---

## Rules (non-negotiable)

1. Domain is truth; tags never mutate commerce state.
2. No purchase from `/success` refresh alone — server + stable `transaction_id`.
3. No secrets in browser or logs.
4. Consent gates marketing tags.
5. Multi-store: resolve container/Pixel by store → platform default.
6. Reuse existing outbox/BullMQ; do not HTTP-call GA/Meta inside order TX.

---

## Related

- [PHASES.md](../PHASES.md) — 18.5, 18.6, 17.2, 21
- [payment.md](./payment.md) — COD / `CodCollected`
- [search.md](./search.md) — Meili ≠ catalog item id
- [notification.md](./notification.md) — preference gate
- [admin-dashboard.md](../admin-dashboard.md) — future `/marketing`, `/analytics`
