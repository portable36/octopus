# Agent skill inventory

This is the reviewed inventory of project-local skills under `.agents/skills`.
It records why a skill is present or absent; it is not a substitute for the
skill's own instructions or a fresh review of executable content.

## Approved and installed

All installed skills below were copied for Cursor and rescanned from their
project-local directories with `skill-security-auditor`.

- `skill-creator` — Anthropic workflow for creating and evaluating skills.
  Audit: PASS; 23 files, including 10 scripts.
- `mcp-builder` — Anthropic guidance for TypeScript/Python MCP servers.
  Audit: PASS; 12 files, including 2 scripts.
- `seo-auditing` — lightweight technical SEO checklist for the Next.js
  storefront. Audit: PASS.
- `penthera` — authorized repository and localhost security scanning guidance.
  Audit: PASS; 13 files, including 3 scripts. Use its authorization gate and
  standard profile; never run deep probes without explicit approval.
- `verifying-markdown-formatting` — documentation formatting checks.
  Audit: PASS.
- `building-skills-from-patterns` — captures repeated agent workflows as
  reusable skills. Audit: PASS.
- `suggesting-skills` — suggests an existing skill when it fits a task.
  Audit: PASS.
- `web-design-guidelines` — Vercel UI, accessibility, and interaction review.
  Audit: PASS.
- `vercel-react-best-practices` — Vercel React/Next.js performance guidance.
  Audit: PASS; 76 files, all documentation.

## Already covered

- `frontend-design` and `pdf` are already installed from Anthropic.
- `database-design` is already covered by the installed
  `database-designer` skill, which better matches PostgreSQL/MikroORM.
- Sentry is already configured in the application, so an additional
  `adding-error-tracking` skill would be redundant.

## Deferred or rejected

- `generating-images` — not installed. The audit reported 2 critical and 3
  high findings for environment credential access, base64 decoding, a hidden
  `.env.example`, and runtime package-install guidance. The current storefront
  also has no approved image-generation requirement.
- `seo-analysis` from `notfair-plugin` — rejected. The audit reported 5
  critical and 33 high findings across its GSC/gcloud scripts; it also requires
  external credentials and home-directory state that are not part of Octopus.
- `authsome` — rejected as a separate credential gateway/runtime rather than a
  project skill. The repository audit reported 16 critical and 6 high findings,
  and Octopus has no requirement to add another credential broker.
- `converting-css-modules-to-tailwind` — deferred because the frontend has no
  CSS-module surface; it passed the static audit.
- `network-request-auditing` — deferred because it requires the
  `cursor-ide-browser` workflow, while this workspace requires IronBee DevTools
  for browser verification; it passed the static audit.
- The remaining Vercel collection skills are not installed: deployment,
  Vercel metrics, React Native, view transitions, and composition workflows are
  outside this slice.

## Spec Kit skills (`.cursor/skills/speckit-*`)

Installed via `specify init --integration cursor-agent` (not copied under
`.agents/skills`). Vendor-managed by the Spec Kit CLI; refresh with
`specify init --here --force …`. See `docs/agents/spec-kit.md`. These skills
are approved for Spec-Driven Development workflows; repository `.cursor/rules/`
still win on conflicts. Do not enable Spec Kit session-start hooks.

## Operating rules

- Keep skills project-local and review updates before use.
- Do not add an agent skill's Python, OpenAI, Sentry, MCP, or scanner packages
  to Octopus runtime dependencies unless a separate product decision requires
  them.
- Do not run credential onboarding, GSC access, image generation, external
  scans, or deep security probes automatically.
- If a skill conflicts with `.cursor/rules/`, `AGENTS.md`, tests, or backend
  authorization and tenant-isolation rules, the repository rules win.
