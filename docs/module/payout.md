# Payout / Vendor Finance Module

## Responsibility

Owns the **immutable vendor ledger**, derived pending/available balances, payout lifecycle, and audited adjustments.

Does **not** own Order/Payment/Return tables, provider charge/refund APIs, or POS till cash.

## Stack

MikroORM + PostgreSQL (not Prisma/MySQL). Redis only for queues/cache.

## Ledger

```text
CREDIT  SALE
DEBIT   COMMISSION
DEBIT   REFUND
±       ADJUSTMENT (platform, audited)
DEBIT   PAYOUT
```

Append-only. Corrections = new reversal/adjustment rows.

Balance = `Σ CREDIT − Σ DEBIT` (rebuildable). Optional snapshot is derived.

## Recognition

- Sale/commission post from **order pricing snapshot** after payment is financially real (`PAID` / COD `COLLECTED`).
- Uncollected COD → no SALE credit.
- Refunds (Phase 14.2) → REFUND debit + commission adjustment per policy — never mutate original SALE/COMMISSION rows.

## Payout lifecycle

```text
REQUESTED → UNDER_REVIEW → APPROVED → PROCESSING → COMPLETED | FAILED
```

`COMPLETED` posts exactly one `DEBIT PAYOUT` (idempotent). Concurrent requests cannot overdraw available balance.

## Boundaries

```text
Payment / Order events → Vendor Finance (ports + outbox)
Return/Refund completed → Vendor Finance
Vendor Finance → PayoutProvider port (external disbursement)
```

## Phase 14.4 (shipped stub)

- `RefundCompleted` outbox includes `allocation` (`entryType: REFUND`, amounts, vendor/store/order refs, `commissionReversalMinor: null`)
- `LedgerPort.recordRefundAllocation` — **stub** in `PayoutModule` (Redis NX idempotency only)
- Domain-events / payment queue consumer calls the port
- **Do not** create a second ledger; Phase 15 replaces stub with append-only `vendor_ledger_entries`

## Related

- [PHASES.md](../PHASES.md) — Phase 15.1–15.4
- [domains/commissions.md](../domains/commissions.md)
- [refunds.md](./refunds.md) · [payment.md](./payment.md)
- `.cursor/rules/08-payments-finance.mdc`
