# Audit Module

## Responsibility

The Audit bounded context owns append-only security and business audit records for sensitive actions across the platform.

Audit owns:

- Immutable audit log entries with actor, action, resource, timestamp, correlation ID
- Before/after snapshots or diffs where policy requires
- Retention and export metadata

Audit does not own:

- Business aggregate state (source modules remain authoritative)
- Real-time alerting (Observability stack consumes audit metrics/events)

## Audited actions (minimum)

- Authentication failures and lockouts
- Role/permission changes
- Vendor approval/suspension
- Price overrides and manual discounts
- Refunds and payout approvals
- Inventory adjustments
- Admin data exports

## Rules

- Append-only storage; no silent updates or deletes
- Redact secrets, tokens, and full payment identifiers
- Correlate with request ID across HTTP and workers

## Testing requirements

- Sensitive action produces audit row
- Tamper-evident storage or DB constraints preventing update/delete
- Cross-tenant audit queries blocked

## Exit criteria

- Central audit write port used by privileged commands (`AUDIT_PORT` in shared-kernel;
  identity auth events write `auth.*` today; Phase 22 expands coverage)
- Retention policy documented in [OPERATIONS.md](../../OPERATIONS.md)

## Related

- [PHASES.md](../PHASES.md) — Phase 20.7 (security dashboard) / Phase 22
- [SECURITY.md](../../SECURITY.md)
