# Notification Module

## Responsibility

Delivery orchestration (email / SMS / push / in-app). Does **not** own Order, Payment, Refund, or Vendor business rules — consumes outbox events via `NOTIFICATION_OUTBOX_HANDLER` / `NOTIFICATION_PORT.notify`.

## Pipeline

```text
Outbox (payment/fulfillment/…)
→ DomainEventsProcessor
→ NotificationEventConsumer (TRANSACTIONAL)
→ templates + preference gate
→ IN_APP / EMAIL (octopus.notification)

Identity register / password change
→ NOTIFICATION_PORT.notify (SECURITY / TRANSACTIONAL; inline until identity_outbox)
```

## Preference gate (17.2)

| Category      | Gate                                                       |
| ------------- | ---------------------------------------------------------- |
| SECURITY      | Always deliver                                             |
| TRANSACTIONAL | Always deliver                                             |
| MARKETING     | `marketing_email` / `marketing_in_app` prefs (default off) |

`GET/PATCH /notifications/preferences`

## HTTP

- `GET /notifications` — in-app inbox + unreadCount
- `POST /notifications/:id/read`
- `GET/PATCH /notifications/preferences`

## Wired events (17.2)

| Event                      | Template                                        |
| -------------------------- | ----------------------------------------------- |
| `CodCollected`             | `payment.cod_collected`                         |
| `RefundCompleted`          | `payment.refund_completed`                      |
| `ShipmentDelivered`        | `fulfillment.shipment_delivered`                |
| Register / password change | `account.welcome` / `security.password_changed` |

Recipient: `ORDER_PORT.getNotificationSnapshot` + `USER_CONTACT_PORT` (email). Guest orders without `customerId` skip notify.

## Channels

| Channel  | v1       | Notes      |
| -------- | -------- | ---------- |
| EMAIL    | log stub | SMTP later |
| IN_APP   | Postgres |            |
| SMS/PUSH | 17.3     |            |

## Rules

- Idempotent `(eventId, recipient, type, channel)`
- Append-only delivery attempts
- No secrets in logs
- Minimal PII in outbox payloads (resolve email in Notification)

## Related

- [PHASES.md](../PHASES.md) — Phase 17
- Phase 12 Messaging
