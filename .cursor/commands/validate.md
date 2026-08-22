# Validate Repository For AI Changes

Run this from the repository root after every behavior change and before reporting completion.

On Windows use `npm.cmd`; on Unix use `npm`.

```bash
npm.cmd run validate
```

The canonical pipeline must pass in this order:

1. **Prettier**: `format:check` validates source, configuration, and documentation formatting.
2. **ESLint**: `lint` checks backend and frontend source without failing on the currently empty frontend scaffold.
3. **TypeScript**: `typecheck` checks strict backend and frontend projects.
4. **Architecture**: `architecture` checks layer and cross-module boundaries.
5. **Tests**: `test` runs the complete configured Vitest suite. Report the exact test-file and test totals; do not assume a fixed count forever.
6. **Environment contract**: `env:check` verifies `.env.example` contains every required configuration key without reading or printing secret values.
7. **Dependency security**: `security` runs the production dependency audit.
8. **Backend build**: `build` compiles the deployable backend output.

If a gate fails:

1. Stop at the first deterministic failure.
2. Capture the command, file, error, and likely owning layer.
3. Run the narrowest relevant check to confirm the hypothesis.
4. Fix the root cause with the smallest coherent change.
5. Add or update a regression test for behavior changes.
6. Re-run the focused check, then run the full validation again.

Do not hide failures by weakening lint, type safety, architecture checks, tests, security checks, or build settings. Do not claim production-ready or error-free output unless every gate passes.

## Additional production checks

The local pipeline is necessary but not sufficient for changes involving these areas:

- **Database**: review migration SQL, test clean and upgrade databases, verify constraints, indexes, RLS, locks, and rollback or forward recovery.
- **API**: test authentication, authorization, tenant isolation, validation, stable errors, pagination, and idempotency.
- **Payments**: test signatures, amount/currency matching, replay protection, duplicate callbacks, refunds, and provider outages.
- **Queues**: test retry limits, timeouts, dead-letter handling, duplicate delivery, and idempotent consumers.
- **Frontend**: test loading, empty, error, unauthorized, stale, offline, accessibility, and mobile states.
- **Operations**: verify logs, correlation IDs, metrics, traces, readiness, alerts, graceful shutdown, and deployment recovery.

Report passed gates, unavailable checks and why, changed tests, and residual risk in the final response.
