# Notification Module

## Responsibility

Delivery orchestration (email / SMS / push / in-app). Does **not** own Order, Payment, Refund, or Vendor business rules — consumes outbox events via `NOTIFICATION_OUTBOX_HANDLER` / `NOTIFICATION_PORT.notify`.

## Pipeline

```text
Outbox (payment/fulfillment/…)
→ DomainEventsProcessor
→ NotificationEventConsumer (TRANSACTIONAL)
→ templates + preference gate
→ IN_APP / EMAIL (`octopus.email` for `NotificationDeliver`; log stub provider)
→ SMS / PUSH (sync in notify(); log stubs; PUSH requires registered devices)

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
- `POST /notifications/devices` — register/refresh push token (upsert by sha256 fingerprint)
- `GET /notifications/devices` — list active devices (id/platform/label/timestamps only; no raw tokens)
- `DELETE /notifications/devices/:deviceId` — revoke

## Wired events (17.2)

| Event                      | Template                                        |
| -------------------------- | ----------------------------------------------- |
| `CodCollected`             | `payment.cod_collected`                         |
| `RefundCompleted`          | `payment.refund_completed`                      |
| `ShipmentDelivered`        | `fulfillment.shipment_delivered`                |
| Register / password change | `account.welcome` / `security.password_changed` |

Recipient: `ORDER_PORT.getNotificationSnapshot` + `USER_CONTACT_PORT` (email). Guest orders without `customerId` skip notify.

## Channels

| Channel | v1        | Notes                                      |
| ------- | --------- | ------------------------------------------ |
| EMAIL   | log stub  | SMTP later                                 |
| IN_APP  | Postgres  |                                            |
| SMS     | log stub  | needs `recipientPhone` on notify           |
| PUSH    | log stub  | device registry; caller must include PUSH |

PUSH is **not** auto-added by the event consumer — only when `channels` includes `PUSH`.

## Rules

- Idempotent `(eventId, recipient, type, channel)`
- Append-only delivery attempts
- No secrets in logs
- Minimal PII in outbox payloads (resolve email in Notification)

## Related

- [PHASES.md](../PHASES.md) — Phase 17
- Phase 12 Messaging
