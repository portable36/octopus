# Data Ownership

## Rule

Each bounded context owns its tables, aggregates, and invariants. Shared tables are prohibited unless ownership is explicitly documented in an ADR and enforced in code reviews.

## Ownership map

| Context      | Owns                                               |
| ------------ | -------------------------------------------------- |
| Identity     | users, credentials, sessions, roles                |
| Vendor       | vendors, vendor staff                              |
| Store        | stores, store staff, store offers                  |
| Catalog      | products, variants, categories, brands, media meta |
| Inventory    | stock, reservations, warehouses                    |
| Cart         | carts, cart lines                                  |
| Checkout     | checkout sessions                                  |
| Order        | orders, lines, snapshots                           |
| Payment      | payment intents, transactions                      |
| Fulfillment  | shipments, tracking                                |
| Refunds      | return requests                                    |
| Payout       | ledger entries, payout batches                     |
| Search       | Meilisearch documents (derived)                    |
| Notification | delivery attempts                                  |
| Audit        | audit log entries                                  |
| Reporting    | analytical projections (derived)                   |

## Read models

Meilisearch indexes and reporting projections are **derived**. PostgreSQL operational tables remain source of truth.

## Cross-context references

Use stable IDs across contexts. Foreign keys do not grant license to bypass module APIs.

## Related

- [ARCHITECTURE.md](../../ARCHITECTURE.md)
- [DATABASE.md](../../DATABASE.md)
- [service-catalog.md](./service-catalog.md)
