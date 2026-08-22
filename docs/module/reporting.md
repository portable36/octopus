# Reporting Module

## Responsibility

The Reporting bounded context owns read-only analytical projections, dashboards, and export jobs. It never mutates operational aggregates.

Reporting owns:

- Materialized views or projection tables fed by events/outbox
- Vendor sales, commission, and payout summaries
- Platform admin operational dashboards data feeds
- Scheduled export jobs (CSV/Parquet) with access controls

Reporting does not own:

- Ledger writes (Payout module)
- Live order state changes

## Data flow

```text
Operational commit -> outbox -> reporting projector -> read model
```

Projections may lag; UI must indicate freshness where needed.

## Rules

- Query only reporting schema or read replicas where deployed
- Heavy queries paginated or pre-aggregated
- Exports audited and rate-limited
- Tenant scope enforced on every report query

## Testing requirements

- Projection idempotency from duplicate events
- Vendor A reports exclude Vendor B data
- Export authorization and audit trail

## Exit criteria

- At least one vendor sales report from projections
- Documented lag SLO and backfill procedure

## Related

- [PHASES.md](../PHASES.md) — Phase 21
- [Payout Module](./payout.md)
- [admin-dashboard.md](../admin-dashboard.md)
