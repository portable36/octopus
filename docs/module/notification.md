# Notification Module

## Responsibility

Delivery orchestration (email / SMS / push / in-app). Does **not** own Order, Payment, Refund, or Vendor business rules — consumes outbox events.

## Pipeline

```text
Domain outbox → octopus.notification → preference + template → channel worker → provider port
```

## Channels (cost posture)

| Channel | v1                   | Notes                           |
| ------- | -------------------- | ------------------------------- |
| EMAIL   | SMTP or console stub | Prefer free/self-hosted         |
| IN_APP  | Postgres             | First durable channel           |
| SMS     | Port + stub          | Pick BD-friendly provider later |
| PUSH    | Port + stub          | Optional FCM free tier later    |

## Rules

- Idempotent: `eventId + recipient + type + channel`
- Delivery attempts append-only
- Template `en` / `bn` + version recorded on send
- Transactional/security not user-disableable
- No provider secrets in logs

## Related

- [PHASES.md](../PHASES.md) — Phase 17.1–17.3
- Phase 12 Messaging (`octopus.notification` queue reserved)
