# Payout / Vendor Finance Module

## Responsibility

Owns the **immutable vendor ledger**, derived pending/available balances, payout lifecycle, and audited adjustments.

Does **not** own Order/Payment/Return tables, provider charge/refund APIs, or POS till cash.

## Stack

MikroORM + PostgreSQL (not Prisma/MySQL). Redis only for queues/cache.

## Ledger (Phase 15.1)

```text
CREDIT  SALE
DEBIT   COMMISSION
DEBIT   REFUND
±       ADJUSTMENT (platform, audited)
DEBIT   PAYOUT
```

Append-only `vendor_ledger_entries`. Corrections = new reversal/adjustment rows.

Balance snapshot `vendor_ledger_balances` is **derived** via `rebuildVendorBalance`.

- SALE amount = `subtotalMinor − discountMinor` from order snapshot (never reprice)
- COMMISSION = `order.commissionMinor`
- Settlement: `LEDGER_SETTLEMENT_DAYS` (default 7) before SALE/COMMISSION count as available
- REFUND debits apply immediately to available

## Recognition

- `CodCollected` (payment queue) → `LedgerPort.recordSaleRecognition` (requires order `PAID`)
- Uncollected COD → no SALE credit
- `RefundCompleted` → `LedgerPort.recordRefundAllocation` (persisted entry, not Redis stub)

## APIs

- `GET /api/v1/finance/vendors/:vendorId/balance` — `finance.ledger.read`
- `GET /api/v1/finance/vendors/:vendorId/summary` — dashboard (pending/available/reserved/spendable + type totals)
- `GET /api/v1/finance/vendors/:vendorId/ledger?limit&offset`
- `GET /api/v1/finance/vendors/:vendorId/statement?limit&offset&from&to` — paginated statement + `total`
- `GET /api/v1/finance/vendors/:vendorId/reconciliation` — platform `finance.ledger.reconcile` (report only)
- `POST /api/v1/finance/vendors/:vendorId/adjustments` — platform `finance.ledger.adjust` + Idempotency-Key
- `POST /api/v1/finance/vendors/:vendorId/payouts` — `payout.request` + Idempotency-Key
- `GET /api/v1/finance/vendors/:vendorId/payouts` — `payout.read`
- `GET /api/v1/finance/payouts/:payoutId`
- `POST /api/v1/finance/payouts/:payoutId/approve` — platform `payout.approve`
- `POST /api/v1/finance/payouts/:payoutId/reject` — platform (releases reservation)
- `POST /api/v1/finance/payouts/:payoutId/process` — platform `payout.process` (stub provider)

## Adjustments + reconciliation (Phase 15.3)

- Platform ADJUSTMENT posts append-only CREDIT/DEBIT with `reason` + `actorUserId` audit metadata and `LedgerAdjustmentRecorded` outbox.
- Reconciliation compares derived balance vs snapshot and lists orphan PAYOUT refs; **never auto-fixes**.
- Statement returns `{ items, total, limit, offset, from, to }` with optional ISO date filters.

## Refund / commission (Phase 15.4)

- `RefundCompleted` → `DEBIT REFUND` + proportional commission CREDIT (`floor(commission × refund / orderTotal)` from order snapshot).
- Vendor portal (Phase 19.5) consumes `/summary`, `/statement`, and payout request; platform approve/reject/process stay admin-only.

## Payout lifecycle (Phase 15.2)

```text
REQUESTED → UNDER_REVIEW → APPROVED → PROCESSING → COMPLETED | FAILED
                         ↘ REJECTED
```

- Request creates `UNDER_REVIEW` immediately; amount ≤ `available − sum(in-flight)`.
- In-flight statuses reserve available (REQUESTED / UNDER_REVIEW / APPROVED / PROCESSING).
- Concurrent requests serialize on `vendor_ledger_balances` row lock.
- `COMPLETED` posts exactly one `DEBIT PAYOUT` (`ledger:payout:{id}`).
- `FAILED` / `REJECTED` release reservation; no ledger debit.

## Boundaries

```text
Payment / Order events → Vendor Finance (ports + outbox)
Return/Refund completed → Vendor Finance
Vendor Finance → PayoutProvider port (external disbursement)
```

## Related

- [PHASES.md](../PHASES.md) — Phase 15.1–15.4
- [domains/commissions.md](../domains/commissions.md)
- [refunds.md](./refunds.md) · [payment.md](./payment.md)
- `.cursor/rules/08-payments-finance.mdc`
