---
name: cost-efficient-agent
description: >
  Reduce token and tool-call waste on Octopus work. Use when sessions feel
  sprawling, exploration is broad, or the user asks for cheaper/faster agent runs.
---

# Cost-Efficient Agent (Octopus)

Minimize context load without skipping safety gates (tenant, payments, validate).

## Rules

1. **Search before read** — Grep/Graphify/Glob first; read only needed line ranges.
2. **Graphify before broad exploration** — architecture / “what depends on X”:

```powershell
$env:PATH = "C:\Users\amzad\.local\bin;$env:PATH"
graphify query "<question>"
```

3. **Do not reload** unchanged files already read this session.
4. **Parallelize independent** tool calls; never parallelize dependent ones.
5. **Task decompose** multi-asks; finish one before loading context for the next.
6. **Prefer** production code as truth; open tests when behavior/edge cases matter.
7. **Do not** read all of `docs/PHASES.md` — grep the phase section.
8. **Ponytail ladder** still applies: YAGNI → reuse → stdlib → smallest fix.
9. If 20+ tool calls with no progress, stop and state the blocker.

## Product / infra cost (not just tokens)

Prefer **open-source and free** tools/products for Octopus. Escalate to paid only when free/OSS is insufficient (security, reliability, Bangladesh ops, or clear engineering-time win). Do not add paid SaaS lightly; keep integrations behind ports. See `docs/product/current-baseline.md`.

## Never cheap about

Tenant isolation, authorization, money/inventory correctness, secret handling, or skipping `npm.cmd run validate` when claiming done.
