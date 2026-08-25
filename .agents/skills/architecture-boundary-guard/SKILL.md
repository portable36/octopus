---
name: architecture-boundary-guard
description: >
  Enforce Octopus modular-monolith and DDD layer boundaries. Use when implementing
  or reviewing changes that touch modules, ports/adapters, controllers, repositories,
  cross-module imports, or shared-kernel contracts.
---

# Architecture Boundary Guard (Octopus)

Prevent architecture drift. Octopus hard rules win over generic NestJS advice.

## Authority (mandatory)

1. `.cursor/rules/02-architecture-boundaries.mdc`
2. `.cursor/rules/01-backend-ddd.mdc`
3. `.cursor/rules/00-core.mdc`
4. `scripts/check-architecture.mjs` (via `npm.cmd run architecture`)

Do **not** invent a parallel architecture. Prefer Graphify for structure questions:

```powershell
$env:PATH = "C:\Users\amzad\.local\bin;$env:PATH"
graphify query "<question>"
graphify path "<SymbolA>" "<SymbolB>"
```

## Workflow

1. Identify owning module under `backend/src/modules/<context>/`.
2. Confirm dependency direction: presentation → application → domain; infrastructure implements ports.
3. Forbid cross-module imports between `backend/src/modules/*` — use shared-kernel ports/events.
4. Shared-kernel must not import modules.
5. Domain must stay framework-free (no Nest/MikroORM in `domain/`).
6. Controllers return DTOs, not ORM entities.
7. When boundaries changed, run:

```powershell
npm.cmd run architecture
```

8. Report violations with file paths and the corrective port/event move.

## Precedence conflicts

If a NestJS skill suggests CQRS buses, microservices, or cross-module service injection that fights Octopus modular monolith rules — **reject it** and keep Octopus boundaries.
