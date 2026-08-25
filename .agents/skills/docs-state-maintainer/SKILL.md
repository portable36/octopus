---
name: docs-state-maintainer
description: >
  Keep Octopus docs accurate and cross-linked. Use when updating PHASES, module
  docs, admin-dashboard, AGENTS.md, ADRs, or after shipping a phase slice.
---

# Docs State Maintainer (Octopus)

## Authority

1. `.cursor/rules/17-documentation.mdc` (when present)
2. Canonical maps: `docs/PHASES.md`, `docs/admin-dashboard.md`, `AGENTS.md`, `CONTEXT.md`
3. Module docs under `docs/module/`

## Workflow

1. Prefer updating the **canonical** doc over duplicating guidance.
2. When a phase slice ships, update the matching checklist in `docs/PHASES.md`.
3. When admin surfaces change, keep `docs/admin-dashboard.md` aligned with `frontend/src/app/(admin)/`.
4. When a bounded context changes contracts, update `docs/module/<context>.md`.
5. Keep `AGENTS.md` skill router rows in sync when skills are added/removed.
6. Do not invent parallel roadmaps. Fix stale links instead of copying large sections.
7. Avoid committing generated noise (`backend/dist`, `.env`, graphify cache).

## Output

- Docs touched + why
- Stale references fixed or explicitly deferred
