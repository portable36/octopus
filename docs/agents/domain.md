# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root (ubiquitous language / glossary only)
- **`docs/adr/`**: ADRs named `ADR-NNNN-*.md` that touch the area you're about to work in
- Module and domain docs under `docs/module/` and `docs/domains/` for ownership and rules (not glossary)

If a glossary term is missing from `CONTEXT.md`, proceed with the term used in code/`docs/`, and note the gap for `/domain-modeling` or `/grill-with-docs`.

## File structure

Single-context product (this repo): one marketplace platform with many NestJS bounded contexts under `backend/src/modules/*`, plus `frontend/`. Domain language is shared; keep **one** root `CONTEXT.md`.

```text
/
├── CONTEXT.md
├── docs/
│   ├── adr/
│   │   ├── ADR-0001-modular-monolith.md
│   │   └── ADR-0002-event-driven-architecture.md
│   ├── agents/          ← skill config (this folder)
│   ├── domains/
│   └── module/
├── backend/src/modules/
└── frontend/
```

Do **not** create per-module `CONTEXT.md` files unless the team later adopts `CONTEXT-MAP.md` deliberately.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0001 (modular monolith), but worth reopening because…_
