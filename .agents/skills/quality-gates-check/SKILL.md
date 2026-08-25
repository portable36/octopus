---
name: quality-gates-check
description: >
  Run Octopus verification gates before claiming work done. Use when finalizing
  implementation, preparing handoff/review, or after behavior changes.
---

# Quality Gates Check (Octopus)

## Authority

1. `.cursor/rules/23-testing-validation.mdc`
2. `.cursor/rules/25-agent-workflow.mdc`
3. Root scripts in `package.json` (`validate`)

## Workflow

1. Identify owning module and nearest tests before claiming done.
2. Run the **narrowest** relevant check after each edit (unit/spec in the module).
3. Before completion, from repo root on Windows:

```powershell
npm.cmd run validate
```

Validation order: format → lint → typecheck → architecture → tests → env contract → dependency audit → build.

4. Report exact outcomes (pass/fail). Do not claim production-ready without validate green.
5. If a check cannot run (missing DB/Redis), report the blocker and run every other available check.
6. Never weaken gates with `any`, skipped tests, disabled lint, or architecture bypasses.

## Risk extras

| Change type | Also verify |
| --- | --- |
| Money / payments / COD | focused payment/order tests + idempotency semantics |
| Tenant / RLS / authz | tenancy/authorization specs |
| Migrations | review SQL; additive preferred |
| Admin UI | frontend typecheck/build via validate |

## Output

- Commands run + results
- Residual risks / blockers
- Whether `validate` is green
