# Spec Kit (Spec-Driven Development)

Octopus uses [GitHub Spec Kit](https://github.com/github/spec-kit) as an optional
Spec-Driven Development workflow alongside mattpocock planning skills and the
always-on ponytail rule. Hard engineering constraints stay in `.cursor/rules/`.

## Install (once per machine)

Requires [uv](https://docs.astral.sh/uv/). On Windows, keep `~\.local\bin` on
`PATH`.

```powershell
uv tool install specify-cli --force --from git+https://github.com/github/spec-kit.git
# Pin example: ...@v1.0.4
```

This repo was initialized with Spec Kit **1.0.4**, Cursor integration
`cursor-agent`, PowerShell scripts, and the `bug` + `assess` extensions.

```powershell
# Re-init / refresh (brownfield; merge carefully)
specify init --here --force --non-interactive --integration cursor-agent --script ps --extension bug --extension assess
```

## Layout

| Path | Role |
| ---- | ---- |
| `.specify/` | Templates, PowerShell scripts, workflows, extensions, constitution |
| `.specify/memory/constitution.md` | Project principles for Spec Kit commands |
| `.cursor/skills/speckit-*/` | Cursor Agent skills (`/speckit-*`) |
| `specs/` | Feature specs created by `/speckit-specify` (created on first use) |

Machine-local Spec Kit pointers under `.specify/` (for example `feature.json`)
are gitignored via `.specify/.gitignore`.

## Primary skills

1. `/speckit-constitution` — update principles (already seeded for Octopus)
2. `/speckit-specify` — baseline specification
3. `/speckit-clarify` (optional) — de-risk ambiguity before planning
4. `/speckit-plan` — implementation plan
5. `/speckit-checklist` (optional) — quality checklist
6. `/speckit-tasks` — actionable tasks
7. `/speckit-analyze` (optional) — cross-artifact consistency
8. `/speckit-implement` — execute implementation
9. `/speckit-converge` — assess codebase and append remaining tasks

### Extensions installed

- **Bug triage:** `/speckit-bug-assess`, `/speckit-bug-fix`, `/speckit-bug-test`
- **Idea assessment:** `/speckit-assess-intake` → research → shape → define → decide

## Precedence

1. `.cursor/rules/` (tenant isolation, payments, module boundaries, authn)
2. Octopus constitution (`.specify/memory/constitution.md`)
3. Spec Kit templates and skills
4. Other agent skills (mattpocock, ponytail, NestJS skills, …)

## Automatic routing

Agents must not ask the user to pick a workflow. See
`.cursor/rules/41-delivery-routing.mdc`:

- Clear small work → just code under ponytail
- Ambiguous design → `/grill-me` first
- Durable / multi-module / contract work → Spec Kit loop
- Approved plan needing agent slices → `/to-tickets`

Do **not** add Spec Kit session-start hooks that force skill checks on every
reply.

## Related

- `AGENTS.md` — everyday skill table
- `docs/engineering/ai-assisted-development.md` — agent tooling decisions
- Upstream: https://github.com/github/spec-kit
