# Customer Module

## Responsibility

Customer profile and address book distinct from Identity credentials. Order history and returns are consumed via Order/Returns APIs — this module does not own order mutation or payment.

## Status (Phase 18.1)

| Capability                             | Status                                      |
| -------------------------------------- | ------------------------------------------- |
| Identity auth (register/login/refresh) | Shipped — Identity module                   |
| Profile linked 1:1 to Identity user    | **Shipped** — `GET/PATCH /customer/profile` |
| Address book CRUD                      | **Shipped** — `/customer/addresses`         |
| Orders / returns UI                    | Phase 18.4 (APIs exist)                     |
| Wishlist                               | Deferred                                    |
| Reviews                                | Deferred                                    |
| Notification preferences               | Phase 17 — `/notifications/preferences`     |

Code: `backend/src/modules/customer`.

## HTTP

- `GET /api/v1/customer/profile` — get or create owner profile
- `PATCH /api/v1/customer/profile`
- `GET/POST /api/v1/customer/addresses`
- `PATCH/DELETE /api/v1/customer/addresses/:addressId`

Ownership is always the JWT `userId` — never a client-supplied user id.

## Rules

- Derive ownership from authenticated user
- PII minimization in logs
- Address validation at application boundary
- Guest cart merge is **Cart** (`POST /cart/merge`)

## Related

- [PHASES.md](../PHASES.md) — Phase 18.1–18.5
- [Identity](./identity.md) · [Cart](./cart.md) · [marketplace.md](./marketplace.md)
