# AGENTS

Project guidance for coding agents working in this repository.

## Agent skills

Installed under `.agents/skills/`:

- [mattpocock/skills](https://github.com/mattpocock/skills) — planning and delivery workflows
- [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) — lazy-senior minimalism (always-on via `.cursor/rules/39-ponytail.mdc`)
- [anthropics/skills](https://github.com/anthropics/skills) — `/pdf`, `/frontend-design`, `/webapp-testing`
- [google-labs-code/stitch-skills](https://github.com/google-labs-code/stitch-skills) — `/shadcn-ui`, `/design-md`
- [redis/agent-skills](https://github.com/redis/agent-skills/tree/main/skills/redis-core) — `/redis-core` (cache/sessions/queues only — never inventory or money truth)
- [alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills) — curated engineering subset only (~20 skills; not the full ~343 pack)
- [amirtaherkhani/nestjs-agent-skills](https://github.com/amirtaherkhani/nestjs-agent-skills) — NestJS architecture / OOP / performance (Octopus rules win on conflicts)
- Octopus-adapted ops skills (from Colorcom patterns): `/architecture-boundary-guard`, `/quality-gates-check`, `/docs-state-maintainer`, `/cost-efficient-agent`

Prefer mattpocock for planning/delivery and ponytail for minimal diffs; keep `.cursor/rules/` as the hard engineering contract. Third-party skills must not weaken tenant isolation, payments, authn, or module boundaries.

### Issue tracker

GitHub Issues on `portable36/octopus` via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default roles: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context glossary in root `CONTEXT.md`; ADRs in `docs/adr/`. See `docs/agents/domain.md`.

## Everyday flows

| Goal                     | Skill                                                             |
| ------------------------ | ----------------------------------------------------------------- |
| Align before building    | `/grill-with-docs` or `/grill-me`                                 |
| Which skill to use       | `/ask-matt`                                                       |
| Spec from this chat      | `/to-spec`                                                        |
| Break into tickets       | `/to-tickets`                                                     |
| Implement a spec/tickets | `/implement` (drives `/tdd`)                                      |
| Hard bug                 | `/diagnosing-bugs`                                                |
| Architecture survey      | `/improve-codebase-architecture`                                  |
| Session handoff          | `/handoff`                                                        |
| Smallest fix / YAGNI     | `/ponytail` (also always-on rule)                                 |
| Overbuilt diff review    | `/ponytail-review`                                                |
| Find unused complexity   | `/ponytail-audit`                                                 |
| UI / storefront polish   | `/frontend-design`, `/shadcn-ui`                                  |
| Design system notes      | `/design-md`                                                      |
| Browser / Playwright QA  | `/webapp-testing`, `/playwright-pro`                              |
| PDF forms / receipts     | `/pdf`                                                            |
| Redis modeling           | `/redis-core`                                                     |
| API contract review      | `/api-design-reviewer`                                            |
| Schema / migrations      | `/database-designer`, `/migration-architect`                      |
| NestJS architecture      | `/nestjs-architecture-principles` (+ OOP/perf siblings)           |
| Module boundary check    | `/architecture-boundary-guard`                                    |
| Pre-merge validate       | `/quality-gates-check`                                            |
| Docs after a phase slice | `/docs-state-maintainer`                                          |
| Cheaper agent sessions   | `/cost-efficient-agent`                                           |
| Security deep-dive       | `/senior-security`, `/skill-security-auditor`                     |
| Ops / SLOs / incidents   | `/observability-designer`, `/slo-architect`, `/incident-response` |
| Role lens (BE/FE/QA)     | `/senior-backend`, `/senior-frontend`, `/senior-qa`               |

## Non-negotiables (also in `.cursor/rules`)

- Modular monolith: no cross-module imports; ports in shared-kernel when needed
- Tenant isolation and authorization on every mutation
- Financial and inventory paths need tests and idempotency semantics
- Validate with `npm.cmd run validate` before claiming done
- Prefer Graphify for code structure questions; OpenViking (optional) for doc/memory recall
- Prefer open-source / free tools and products when they are good enough; paid only when OSS/free fails on security, reliability, ops fit, or time — see `docs/product/current-baseline.md`

## Related

- `docs/engineering/ai-assisted-development.md`
- `docs/PHASES.md` (living checklist; Cursor plans are historical — see `docs/agents/plan-fit.md`)
- `.cursor/rules/00-core.mdc`
