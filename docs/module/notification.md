# Notification Module

## Responsibility

The Notification bounded context owns delivery orchestration for email, SMS, push, and in-app notifications. It does not own the business facts that trigger notifications.

Notification owns:

- Notification template references and channel routing
- Delivery attempts, status, and provider message IDs
- User/channel preference gates where applicable
- Retry and dead-letter handling for delivery workers

Notification does not own:

- Order, payment, or shipment aggregates (consumes their events)
- Marketing campaign definition (Promotion/Customer modules may emit triggers)

## Delivery model

Business modules emit integration events via outbox. Notification workers render templates and call provider adapters (email/SMS/push) asynchronously.

```text
Domain event -> outbox -> notification queue -> provider adapter
```

## Rules

- No PII in logs beyond redacted identifiers
- Unsubscribe and preference checks before marketing channels
- Idempotent delivery keyed by event ID + channel + recipient
- Timeouts and structured failure logging on every provider call

## Testing requirements

- Duplicate event does not double-send
- Template rendering with missing variables fails safely
- Preference suppression honored
- Provider failure retries and DLQ behavior

## Exit criteria

- At least one channel (email) end-to-end from outbox
- Delivery metrics and correlation IDs present

## Related

- [PHASES.md](../PHASES.md) — Phase 17
- `.cursor/rules/07-events-outbox-queues.mdc`
- `.cursor/rules/28-integration-resilience.mdc`
