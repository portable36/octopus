# UX journey parity (Martvill / App → Octopus)

Columns: **Martvill** (web) · **App** (Expo) · **Octopus today** · **Target**.

| Journey              | Martvill                      | App            | Octopus today                                        | Target                        |
| -------------------- | ----------------------------- | -------------- | ---------------------------------------------------- | ----------------------------- |
| Home / featured      | Yes                           | Yes            | Not built (admin shell only)                         | Storefront App Router         |
| Search / filter      | Yes                           | Yes            | Meilisearch env + Phase 16.1 API (index fill = 16.2) | Storefront search UI (18.2)   |
| Category browse      | Yes                           | Yes            | Catalog API (vendor-scoped today)                    | Public PLP (18.1–18.2)        |
| PDP / variants       | Yes                           | Yes            | Catalog + pricing APIs                               | Storefront PDP (18.2)         |
| Cart                 | Yes                           | Yes            | Cart module                                          | Storefront cart (18.3)        |
| Checkout + address   | Yes                           | Yes            | Checkout API                                         | Storefront checkout (18.3)    |
| COD                  | Module                        | Via API        | Phase 11 shipped                                     | Storefront payment UX (18.3)  |
| Online gateways      | Stripe/PayPal modules         | Likely         | Stubbed intents                                      | Phase 11 remaining            |
| Vendor shop page     | Yes                           | Yes            | Vendor/Store APIs                                    | Storefront vendor pages       |
| Orders / tracking    | Yes                           | Yes            | Order + fulfillment APIs                             | Customer order UI             |
| Auth                 | Passport / customer           | Login/register | Identity JWT                                         | Storefront auth + later OAuth |
| Wishlist / reviews   | Likely                        | Yes (reviews)  | Not built                                            | Later phase                   |
| Admin CMS / menus    | PageBuilder, MenuBuilder, CMS | n/a            | Settings/Media/Audit stubs                           | Phase 20.3 (deferred)         |
| Admin vendors/stores | Yes                           | n/a            | Phase 20.1 read lists                                | Phase 20.2 lifecycle UI       |
| POS receipts         | Pos module                    | n/a            | Receipt templates                                    | Phase 20.5 + Epson TM-T81III  |
| Labels               | Delivery/shipping             | n/a            | Fulfillment APIs                                     | Phase 20.5 + Zebra ZD230      |

## Top UX deficits to beat (initial)

1. Slow or cluttered browse → PDP path on Martvill Blade UI
2. Checkout friction (address + COD clarity)
3. Weak mobile-web parity vs Expo app polish
4. Admin CMS complexity vs needed storefront branding controls
5. Fragmented vendor discovery
6. Unclear order/shipment status for customers
7. Receipt/print setup opaque for store staff
8. Mixed English/Bangla UX consistency
9. Search relevance / filters feel bolted on
10. Too many admin modules without a coherent shell (Octopus 20.1 starts fixing this)
