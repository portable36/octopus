# Commissions

## Concept

Platform **commission** is deducted from vendor proceeds according to documented rates, category rules, or campaign overrides. Commission accrual produces ledger debits in the Payout module.

## Calculation timing

Commission is calculated on authoritative checkout/order snapshots, not on live catalog prices.

Typical components:

```text
line subtotal
- vendor-funded discounts (per policy)
= commissionable base
× commission rate
= platform commission
```

## Rules

- Commission rates versioned or effective-dated where overrides exist
- Refunds reverse commission proportionally per documented policy
- Never mutate historical ledger entries; post adjusting entries instead

## Related

- [Payout Module](../module/payout.md)
- [PHASES.md](../PHASES.md) — Phase 15
- [ARCHITECTURE.md](../../ARCHITECTURE.md) — Payouts section
- `.cursor/rules/08-payments-finance.mdc`
