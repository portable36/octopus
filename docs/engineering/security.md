# Security Engineering

## Baseline

Repository security requirements live in [SECURITY.md](../../SECURITY.md). This document summarizes engineering practices when implementing features.

## JWT (Identity)

When touching auth tokens: no PII in JWT claims; opaque tokens at the client boundary (phantom/split token); pin `alg`; validate `iss`/`aud`; short access TTL. Details in [SECURITY.md](../../SECURITY.md) and `.cursor/rules/04-security-authn.mdc`.

## Payments (Payment / Order / Payout)

Idempotency on every payment request; integer minor units only; never debit without guaranteed credit (Saga + compensation); persist gateway transaction ID + response code + timestamp; reconciliation is mandatory. Details in [SECURITY.md](../../SECURITY.md) and `.cursor/rules/08-payments-finance.mdc`.

## Media uploads

Never stream binaries through the NestJS API as the normal path — use presigned direct-to-storage uploads; validate type by magic bytes (not extension); multipart + resumable; async processing; rate and size limits. Details in [SECURITY.md](../../SECURITY.md), [media module](../module/media.md), and `.cursor/rules/38-media-uploads.mdc`.

## Checklist for new endpoints

- Authentication required unless explicitly public
- Authorization policy evaluates role **and** ownership scope
- Input validated with explicit DTO schemas
- Rate limits on auth, checkout, payment, and search endpoints
- Idempotency for retryable mutations
- Audit log for sensitive actions

## Tenant isolation

- Resolve `vendorId` / `storeId` from authenticated context
- PostgreSQL RLS as defense in depth
- Negative tests for cross-tenant access on every privileged route

## Dependencies

Run `npm.cmd run security` in CI. Resolve or document production vulnerabilities before release.

## Related

- [SECURITY.md](../../SECURITY.md)
- [production-readiness.md](./production-readiness.md)
- `.cursor/rules/03-tenant-security.mdc`
- `.cursor/rules/08-payments-finance.mdc`
- `.cursor/rules/22-api-security.mdc`
- `.cursor/rules/33-ai-agent-security.mdc`
- `.cursor/rules/38-media-uploads.mdc`
