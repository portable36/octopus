# Customer Module

## Responsibility

Customer profile and address book distinct from Identity credentials. Order history and returns are consumed via Order/Returns APIs — this module does not own order mutation or payment.

## Status (Phase 18)

| Capability                             | Status                     |
| -------------------------------------- | -------------------------- |
| Identity auth (register/login/refresh) | Shipped — Identity module  |
| Profile linked 1:1 to Identity user    | **Planned — Phase 18.1**   |
| Address book CRUD                      | **Planned — Phase 18.1**   |
| Orders / returns UI                    | Phase 18.4 (APIs exist)    |
| Wishlist                               | Deferred until productized |
| Reviews                                | Deferred until productized |
| Notification preferences               | Deferred — Phase 17        |

There is **no** `backend/src/modules/customer` yet. Do not treat this doc as implemented.

## Rules (when built)

- Derive ownership from authenticated user — never from client-supplied `userId`
- PII minimization in logs
- Address validation at application boundary
- Guest cart merge into customer cart is **Cart module** responsibility (server-side)

## Related

- [PHASES.md](../PHASES.md) — Phase 18.1–18.5
- [Identity](./identity.md) · [Cart](./cart.md) · [Order](./order.md) · [Refunds](./refunds.md)
