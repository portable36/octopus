# Octopus agent memory

This file is durable project context for coding agents. It records verified,
slow-changing decisions and vocabulary—not secrets, credentials, personal data,
generated output, or a transcript of previous chats.

## Project

- Octopus is a modular monolith for multi-vendor, multi-store commerce.
- The Platform governs Vendors and Stores; Customers buy Store offers.
- Backend source is under `backend/src`; frontend source is under `frontend/src`.
- Backend bounded contexts live under `backend/src/modules/<context>`.
- Frontend uses Next.js App Router route groups: `(storefront)`, `(admin)`, and `(vendor)`.
- `CONTEXT.md` is the canonical domain glossary. ADRs live in `docs/adr/`.
- `docs/PHASES.md` is the living delivery checklist; Cursor plans are historical.

## Non-negotiable invariants

- Tenant scope, authorization, and RLS are enforced server-side. Never trust a
  client-provided role, Vendor ID, Store ID, or permission.
- Public registration creates a Customer; privileged roles are provisioned
  through governed flows. Platform admin access requires MFA.
- Refresh tokens use the Identity HttpOnly cookie flow. Browser access tokens
  are short-lived in-memory state; never put tokens in URLs, local storage, or
  logs.
- Money is integer minor units (paisa); totals, discounts, shipping, tax,
  inventory, payment state, and COD eligibility are backend-authoritative.
- Mutations need explicit validation, authorization, transaction,
  idempotency, and failure semantics.
- Domain events use the transactional outbox. Side effects must be retryable
  and deduplicated only after successful delivery.
- Cross-module imports are forbidden. Use ports in the shared kernel when a
  boundary genuinely needs collaboration.

## Frontend baseline

- Keep storefront, admin, and vendor chrome separate.
- Storefront styling is scoped under `.sf-theme` and uses the `sf-*` classes in
  `frontend/src/app/globals.css`.
- The storefront direction is Colorfifty-inspired: compact utility messaging,
  search-led navigation, flat retail catalog cards, strong accent actions, and
  responsive drawers.
- Preserve existing API boundaries and safe product-image placeholders until a
  supported public media URL resolver exists.
- Async UI needs explicit loading, empty, error, unauthorized, stale, and retry
  states. Controls need labels, keyboard access, visible focus, and useful
  announcements.
- Do not add wishlist, ratings, invented promotions, client-side totals, or
  external image URLs without an API contract.

## Agent workflow

1. Read this file, `AGENTS.md`, `CONTEXT.md`, and the relevant `.cursor/rules/`
   file before making a substantive change.
2. Identify the owning module and nearby tests. State a falsifiable hypothesis
   and run a cheap check before editing.
3. Make the smallest coherent change; preserve unrelated working-tree changes.
4. Add a focused regression test for non-trivial behavior.
5. Run the narrowest check, then from the repository root run
   `npm.cmd run validate` on Windows.
6. Inspect `git diff --check` and `git status`; exclude secrets, generated
   output, `.next`, `node_modules`, and `graphify-out/` from delivery.
7. Do not edit an attached plan file. Do not commit or push unless requested,
   except when the whole phase is explicitly complete under the phase-delivery
   rule.

## Tooling and commands

```powershell
# Infrastructure needed for local backend/API work
docker compose up -d postgres redis meilisearch minio

# Development servers
npm.cmd run dev -w backend
npm.cmd run dev -w frontend -- --port 3001

# Required pre-merge gate
npm.cmd run validate

# Refresh the code graph after substantial source changes
graphify update .
```

- Use Graphify for symbols, imports, and code paths.
- Cursor chat backups live in `.cursor/chat-backups/` (auto-export on commit/push).
  Restore via **Cursor Chat Transfer → Import Chats** and `latest.cursor-chat.json`;
  see `docs/engineering/cursor-chat-backup.md`.
- Reviewed project-local skills include `skill-creator`, `mcp-builder`,
  `seo-auditing`, `penthera`, `verifying-markdown-formatting`,
  `building-skills-from-patterns`, `suggesting-skills`,
  `web-design-guidelines`, and `vercel-react-best-practices`. See
  `docs/agents/skill-inventory.md` for the audit record.
- Spec Kit (specify-cli 1.0.4, `cursor-agent`, PowerShell scripts, `bug` +
  `assess` extensions) is installed under `.specify/` with Cursor skills in
  `.cursor/skills/speckit-*`. Constitution lives at
  `.specify/memory/constitution.md`. Feature artifacts go under `specs/`.
  See `docs/agents/spec-kit.md`. Do not add Spec Kit session-start hooks.
- OpenViking is optional local tooling for approved documentation and memory
  only; index `docs/`, `.cursor/rules/`, `AGENTS.md`, and this file—not the
  application tree. Never wire it into runtime or CI.
- `agentmemory` is deferred because it overlaps with OpenViking.
- `browser-use` is deferred; browser verification follows the workspace's
  required IronBee DevTools path when that MCP is available.
- `generating-images` and the `notfair-plugin` `seo-analysis` skill are not
  installed after security audit findings. `authsome` is also not installed
  because it is a separate credential gateway, not an Octopus skill.

## Memory maintenance

- Add only facts that are verified in repository docs, code, or successful
  checks and likely to remain useful across sessions.
- Prefer a short dated decision note when a choice has meaningful trade-offs.
- Remove stale implementation status rather than accumulating a changelog.
- If this file conflicts with code, tests, or `.cursor/rules/`, those sources
  win and this file should be corrected.
