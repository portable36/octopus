# Current product & ops baselines

Reference systems for Octopus UX and deployment. **Do not copy Martvill/Expo code** into the Nest/Next modular monolith—reuse journeys and pain points only.

## Products in production today

| System           | Path                                | Role                                                                                                     |
| ---------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Martvill**     | `C:\Project\martvill`               | Live multi-vendor marketplace (Laravel + modules: CMS, COD, POS, Commission, Shipping, Refund, Media, …) |
| **Customer app** | `C:\Project\app\source_code_v1.4.0` | Expo/React Native app v1.4 (home, PDP, cart, checkout, vendor, profile; i18n incl. `bn`)                 |
| **Octopus**      | `C:\Project\octopus`                | Greenfield replacement (Nest API + Next admin/storefront)                                                |

### Octopus improves / keeps / drops

| Improves                          | Keeps (intent)                         | Drops / defer                            |
| --------------------------------- | -------------------------------------- | ---------------------------------------- |
| Clearer browse → PDP → cart → COD | Multi-vendor + COD + POS receipts      | Martvill module sprawl / Blade CMS as-is |
| Typed admin shell (Phase 20+)     | Bangladesh couriers (Steadfast/Pathao) | Full Expo rewrite (later)                |
| Modular monolith + RLS            | `bn` / `en` as first languages         | Arbitrary page CSS injection             |

## Cost posture (tools & products)

**Prefer open-source and free tiers first** to keep run cost low. Use a paid product only when the OSS/free option is clearly worse on security, reliability, Bangladesh ops fit, or engineering time.

Examples already aligned: PostgreSQL, Redis, BullMQ, Meilisearch, Nest/Next, Cloudflare free/proxied DNS, self-hosted where Hostinger allows. Gate paid SDKs/SaaS behind ports and an explicit “why free failed” note when introducing them.

## Infrastructure

| Concern         | Provider       | Notes                                                                                                 |
| --------------- | -------------- | ----------------------------------------------------------------------------------------------------- |
| DNS / CDN / WAF | **Cloudflare** | Proxy TLS and cache public assets; origin stays Hostinger. No Cloudflare SDKs in domain code.         |
| Hosting         | **Hostinger**  | Node API + Next; Postgres/Redis must be available (VPS or managed if shared hosting is insufficient). |

## Hardware (print)

| Device       | Model               | Use                       | Octopus target                                               |
| ------------ | ------------------- | ------------------------- | ------------------------------------------------------------ |
| Label        | Zebra **ZD230**     | Shipping / barcode labels | Phase 20.5 — ZPL/label adapter                               |
| POS receipt  | Epson **TM-T81III** | Store receipts            | Phase 20.5 — ESC/POS, ~80mm; receipt templates already exist |
| Office laser | HP **Laser 1008W**  | Invoices / packing lists  | PDF path (not thermal)                                       |

Print drivers stay behind ports/adapters. Domain owns receipt/label **content** only.

## Related

- Journey parity: [ux-parity.md](./ux-parity.md)
- Admin ownership: [../admin-dashboard.md](../admin-dashboard.md)
- Roadmap: [../PHASES.md](../PHASES.md) (Phase 12 outbox, 20.3 Website Control Center deferred until Settings/Media/CMS)
