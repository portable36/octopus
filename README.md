# Octopus

<p align="center">
  <img src="octopus.gif" alt="Octopus" width="420" />
</p>

<p align="center">
  <strong>Multi-vendor, multi-store commerce</strong> — modular monolith, strict TypeScript, tenant isolation first.
</p>

Octopus is a production-oriented platform for many vendors and stores on one codebase: NestJS backend, Next.js storefront, PostgreSQL with row-level security, and explicit domain boundaries.

## Stack

| Layer    | Choice                                                        |
| -------- | ------------------------------------------------------------- |
| Backend  | NestJS modular monolith, DDD + Clean Architecture             |
| Frontend | Next.js App Router                                            |
| Data     | PostgreSQL + MikroORM + RLS                                   |
| Async    | Redis + BullMQ                                                |
| Search   | Meilisearch (read models)                                     |
| Auth     | JWT + refresh tokens, RBAC                                    |
| Payments | Bangladesh gateways (SSLCommerz, bKash, Nagad)                |
| Quality  | Vitest, ESLint, Prettier, architecture checks, GitHub Actions |

## Status

Roadmap: [`docs/PHASES.md`](docs/PHASES.md) (Phase 00–30).

Shipped through early catalog/vendor/store work; inventory and checkout follow. See the phase file for checklists.

## Quick start

```bash
npm install
docker compose up -d          # postgres, redis, meilisearch, minio
npm run dev                   # API → http://localhost:3000
npm run dev:frontend          # storefront → http://localhost:3001
npm run validate              # format → lint → typecheck → architecture → tests → build
```

On Windows PowerShell, prefer `npm.cmd run <script>` if the npm shim is blocked.

## Repository layout

```text
backend/src/
  shared-kernel/     # cross-cutting domain + ports
  modules/<context>/ # identity, tenancy, vendor, store, catalog, …
    domain/
    application/
    infrastructure/
    presentation/
frontend/src/        # Next.js App Router
docs/
  PHASES.md          # delivery roadmap
  module/            # bounded-context specs
  architecture/      # system structure
  engineering/       # standards, security, ops
.cursor/rules/       # agent / Cursor engineering contract
scripts/             # validation tooling
```

## Design rules (short)

1. Domain stays pure — no Nest, ORM, HTTP, or vendor SDKs inside it.
2. Application orchestrates; infrastructure implements ports.
3. No cross-module imports; use shared-kernel ports.
4. Deny-by-default tenant / vendor / store authorization.
5. Money in integer minor units; idempotency on retried money paths.
6. Database transactions own invariants; Redis is not the source of truth for money or stock.

No ruleset guarantees a bug-free production system. This repo makes defects harder to ship and easier to catch.

## Docs

| Doc                                    | What                       |
| -------------------------------------- | -------------------------- |
| [PHASES.md](docs/PHASES.md)            | Implementation roadmap     |
| [AGENTS.md](AGENTS.md)                 | Guidance for coding agents |
| [SECURITY.md](SECURITY.md)             | Security posture           |
| [docs/engineering/](docs/engineering/) | Testing, AI workflow, ops  |
| [docs/module/](docs/module/)           | Per-context specifications |

## License

Private / project license — see repository settings.
