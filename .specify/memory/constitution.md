# Octopus Constitution

Spec-Driven Development principles for the Octopus multi-vendor, multi-store
commerce platform. This constitution guides `/speckit-*` workflows. It does
**not** replace `.cursor/rules/`, which remain the hard engineering contract.

## Core Principles

### I. Modular Monolith Boundaries (NON-NEGOTIABLE)

Backend bounded contexts live under `backend/src/modules/<context>`. Cross-module
imports are forbidden. Collaborate only through ports in `shared-kernel` when a
boundary genuinely needs it. Domain code must not leak ORM, HTTP, Redis, or
queue infrastructure. Controllers never return ORM entities.

### II. Tenant Isolation and Authorization (NON-NEGOTIABLE)

Every mutation defines authorization, validation, transaction, idempotency, and
failure semantics. Never trust client-provided roles, Vendor IDs, Store IDs, or
permissions. Enforce tenant scope and RLS server-side. Fail closed.

### III. Financial and Inventory Correctness (NON-NEGOTIABLE)

Money is integer minor units (paisa). Totals, discounts, shipping, tax,
inventory, payment state, and COD eligibility are backend-authoritative.
Payment and inventory paths require focused tests, idempotency semantics, and
reconciliation-safe failure handling. Do not use Redis as the source of truth
for financial or inventory state.

### IV. Spec Before Code for Nontrivial Work

For features that change contracts, multi-module flows, payments, inventory,
authn/authz, or schema: specify → clarify (optional) → plan → tasks → implement.
Small bugfixes and one-line fixes may skip Spec Kit when the change is obvious
and ponytail/YAGNI applies. Specs live under `specs/` and must state acceptance
criteria that a test or validation gate can prove.

### V. Smallest Coherent Change (Ponytail)

Prefer reuse over rewrite. No abstractions that were not requested. No new
dependencies when the stack already solves the problem. Deletion over addition.
Boring over clever. Spec Kit plans must not expand scope beyond the ratified
spec. Mark deliberate shortcuts with a `ponytail:` comment naming the ceiling
and upgrade path.

### VI. Validation Gate

After behavior changes: add the smallest regression test that proves the
invariant, run the narrowest check, then `npm.cmd run validate` from the repo
root before claiming done. Do not weaken lint, architecture checks, or tests to
make a task easier.

### VII. Observability and Safe Operations

Externally visible operations need timeouts, structured outcome logging, and an
explicit retry or no-retry policy. Redact secrets, tokens, payment credentials,
and sensitive personal data. Migrations are additive where possible and reviewed
as SQL. Never claim production-ready without validation.

## Stack and Delivery Constraints

- Backend: NestJS DDD layers under `backend/src`; frontend: Next.js under
  `frontend/src` with `(storefront)`, `(admin)`, `(vendor)` route groups.
- Domain events use the transactional outbox; side effects are retryable and
  deduplicated only after successful delivery.
- Prefer Graphify for code-structure questions; OpenViking is optional local
  doc/memory recall only (never runtime/CI).
- Prefer open-source / free tools when good enough; paid only when OSS/free
  fails on security, reliability, ops fit, or time.
- Browser verification uses IronBee DevTools when that MCP is enabled—not
  alternate browser agents.

## Spec Kit Workflow Fit

Delivery routing is automatic (`.cursor/rules/41-delivery-routing.mdc`): just
code + ponytail for small work; `/grill-me` when ambiguous; Spec Kit for
durable features; `/to-tickets` for agent slices. Do not ask which to use.

| Goal                       | Prefer                                      |
| -------------------------- | ------------------------------------------- |
| Align / grill before build | `/grill-me` or `/grill-with-docs`           |
| Formal SDD for a feature   | `/speckit-specify` → `/speckit-plan` → …    |
| Ticket breakdown           | `/to-tickets`                               |
| Minimal fix / YAGNI        | Just code + `/ponytail` (always-on)         |
| Hard bug                   | `/systematic-debugging` or Spec Kit bug ext |

When Spec Kit guidance conflicts with `.cursor/rules/`, Octopus rules win.
Do not install Spec Kit session-start hooks that auto-force skill checks on
every reply (same rationale as Superpowers session bootstrap).

## Governance

1. `.cursor/rules/` and this constitution bind all Spec Kit artifacts
   (`spec.md`, `plan.md`, `tasks.md`) and agent implementations.
2. Amendments to this constitution require an explicit update here and a short
   note in `memory.md` when the change is durable.
3. Specs that would weaken tenant isolation, payments, authn, module
   boundaries, or auditability must be rejected—not implemented.
4. Do not commit secrets, `.env`, credentials, `graphify-out/`, or build
   artifacts. Commit Spec Kit project files (`.specify/`, `.cursor/skills/speckit-*`,
   and `specs/`) when the team chooses to share them; machine-local Spec Kit
   state under `.specify/` is already gitignored where appropriate.
5. Whole phases in `docs/PHASES.md` follow the phase commit/push rule; individual
   Spec Kit slices do not auto-commit.

**Version**: 1.0.0 | **Ratified**: 2026-09-04 | **Last Amended**: 2026-09-04
