# Coding Standards

## Scope and ownership

- Backend source is under `backend/src`; frontend source is under `frontend/src`.
- A bounded context owns its domain rules, persistence model, and public application contracts.
- Shared-kernel code is intentionally small and may not depend on a feature module.

## TypeScript

- Keep strict TypeScript enabled and avoid `any`.
- Use `unknown` for untrusted input and narrow it with schemas or type guards.
- Prefer discriminated unions for state machines and exhaustive handling for transitions.
- Use explicit return types for public application, adapter, and controller methods.
- Preserve error causes when translating errors; never catch and ignore failures.

## Architecture

```text
presentation -> application -> domain
infrastructure -> application/domain ports
```

Domain code is framework-free. Controllers do transport work only. Infrastructure implements ports and maps persistence models to domain objects.

## Security and tenant scope

- Authenticate before authorization and derive tenant, vendor, store, and actor scope from the principal.
- Treat all browser-provided ownership, pricing, inventory, permission, and payment fields as untrusted.
- CORS uses a validated explicit allowlist; credentials are never combined with a wildcard origin.
- Do not log credentials, tokens, payment secrets, or sensitive request bodies.

## Data and money

- Use database constraints and transactions for invariants.
- Use integer minor units with an explicit currency for money; never use floating-point arithmetic.
- Use idempotency for retried mutations and callbacks.
- Publish durable side effects through the transactional outbox after commit.

## Change quality

- Add a regression test for changed behavior at the lowest practical layer.
- Run formatting, lint, typecheck, architecture, tests, and dependency audit before declaring a change complete.
- Update architecture, security, operational, or API documentation when its contract changes.
