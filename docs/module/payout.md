# Payout Module

## Responsibility

The Payout bounded context owns vendor financial ledger entries, commission calculation results, balance projections, payout requests, and payout batch processing.

Payout owns:

- Immutable ledger entries (credit/debit)
- Commission accrual records tied to source orders/events
- Available vs pending balance projections
- Payout request and payout batch lifecycle
- Payout failure and retry metadata

Payout does not own:

- Order or payment capture (source events from Order/Payment)
- Customer refunds execution (Refunds/Payment)
- Mutable `vendor.balance` as sole source of truth

## Ledger model

```text
CREDIT  sale proceeds
DEBIT   platform commission
DEBIT   refund impact
CREDIT  adjustment (audited)
DEBIT   payout disbursement
```

Current balance is derived from ledger history. Any cached balance field must be reconstructible and auditable.

## Payout lifecycle

```text
REQUESTED -> APPROVED -> PROCESSING -> COMPLETED | FAILED
```

Failed payouts retain history and support safe retry with idempotency.

## Testing requirements

- Ledger immutability
- Commission math against order snapshots
- Payout cannot exceed available balance
- Vendor A ledger isolated from Vendor B
- Idempotent payout processing

## Exit criteria

- Append-only ledger with migration constraints
- Commission rules documented in [domains/commissions.md](../domains/commissions.md)
- Payout integration behind provider port where external disbursement exists

## Related

- [PHASES.md](../PHASES.md) — Phase 15
- [domains/commissions.md](../domains/commissions.md)
- `.cursor/rules/08-payments-finance.mdc`
