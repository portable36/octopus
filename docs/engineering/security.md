# Security Engineering

## Baseline

Repository security requirements live in [SECURITY.md](../../SECURITY.md). This document summarizes engineering practices when implementing features.

## HTTP boundary (Phase 25.1–25.3)

| Control        | Behavior                                                                                                                                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Helmet         | Enabled in `configureApplication`; CSP off outside production for Swagger/dev DX                                                                                                                               |
| CORS           | Explicit `CORS_ORIGINS` allowlist + credentials; methods/headers allowlisted; `*` rejected by env validation                                                                                                   |
| ValidationPipe | Global whitelist + `forbidNonWhitelisted` + transform                                                                                                                                                          |
| Body limit     | `HTTP_BODY_LIMIT` (default `1mb`)                                                                                                                                                                              |
| Permissions    | Global `PermissionsGuard`; admin routes use `@RequirePermissions` (`platform.*` for platform-only lists). Store admin: `platform.stores.read` / `platform.stores.write` for `/admin/stores` list vs lifecycle. |
| Output         | API responses are JSON (no HTML templates); React text escaping; JSON-LD escapes `<`                                                                                                                           |
| SSRF           | Courier outbound URLs must match `OUTBOUND_URL_ALLOWLIST` + PATHAO/STEADFAST base hosts; https only                                                                                                            |
| API rate limit | Redis `API_RATE_LIMITER`: checkout 20/min/IP; search 60/min/IP; COD collect 30/min/IP; refund 20/min/IP; media register/upload-session 30/min/user                                                             |
| Trust proxy    | `TRUST_PROXY_HOPS` (default `0`): Express hop count for `req.ip`. Set to `1` behind a single LB; never `true` (spoofable `X-Forwarded-For`)                                                                    |

### CSRF strategy

- Access tokens travel in the `Authorization: Bearer` header (not cookies) → classic CSRF does not apply.
- Refresh tokens use an **HttpOnly** cookie scoped to `Path=/api/v1/auth`, `SameSite=lax`, `Secure` in production.
- Cross-origin credentialed calls require an origin on `CORS_ORIGINS`.
- No synchronizer CSRF token while refresh stays SameSite=lax and path-scoped. If refresh ever needs `SameSite=none`, add a CSRF token or double-submit cookie before enabling it.

## Auth rate limits

Redis keys under `identity:login-rate:*` (20 / 15m):

- Login failures (`ip:email`)
- Register attempts (`register:ip`)
- Forgot-password attempts (`forgot:ip:email`)

## JWT (Identity)

When touching auth tokens: no PII in JWT claims; opaque tokens at the client boundary (phantom/split token); pin `alg`; validate `iss`/`aud`; short access TTL. Details in [SECURITY.md](../../SECURITY.md) and `.cursor/rules/04-security-authn.mdc`.

**Key rotation:** set `JWT_SECRET` to the new value and keep the old value in `JWT_SECRET_PREVIOUS` until access TTLs expire, then remove the previous secret. Refresh tokens are opaque Redis hashes and are unaffected by JWT signing key rotation.

## MFA (TOTP)

Opt-in authenticator MFA (`POST /auth/mfa/setup` → `enable`; `disable` with password + code):

- TOTP secret encrypted at rest (`mfa_secret_cipher`); never returned after enable.
- Login with MFA enabled returns `{ mfaRequired, mfaToken }` (no session cookie); complete via `POST /auth/mfa/verify`.
- Challenge tokens live in Redis (`identity:mfa-challenge:*`, 5m TTL).
- **Platform admin gate:** any `@RequirePermissions('platform.*')` call from a `PLATFORM_ADMIN` without `mfaEnabled` in the access token returns `403 MFA_ENROLLMENT_REQUIRED`. Enroll via `/auth/mfa/*`, then refresh/login to get a new token.

## Webhook helpers

Shared utilities (wire when online gateways land):

- `verifyHmacSha256Hex` — timing-safe HMAC-SHA256
- `assertWebhookTimestampFresh` — ±5m skew / replay window

COD has no provider webhook. Online gateway callbacks must use these before mutating payment state.

## Secrets

Production secrets are injected as environment variables from the platform secret manager (K8s secrets, cloud SM, etc.). The app does not embed a Vault/SM client — rotate by updating the deployment secret and (for JWT) using `JWT_SECRET_PREVIOUS` during overlap.

## Payments (Payment / Order / Payout)

Idempotency on every payment request; integer minor units only; never debit without guaranteed credit (Saga + compensation); persist gateway transaction ID + response code + timestamp; reconciliation is mandatory. Details in [SECURITY.md](../../SECURITY.md) and `.cursor/rules/08-payments-finance.mdc`.

## Media uploads

Never stream binaries through the NestJS API as the normal path — use presigned direct-to-storage uploads; validate type by magic bytes (not extension); multipart + resumable; async processing; rate and size limits. Details in [SECURITY.md](../../SECURITY.md), [media module](../module/media.md), and `.cursor/rules/38-media-uploads.mdc`.

Metadata registration allowlists `image/jpeg|png|webp|gif`, caps size at 10 MiB, rejects URL/`..` storage keys, and requires `contentPrefixBase64` (≥12 header bytes) matching the declared type. Object-store Head/Get verification after upload remains a follow-up when the ingest pipeline lands.

## Checklist for new endpoints

- Authentication required unless explicitly public
- Authorization policy evaluates role **and** ownership scope
- Input validated with explicit DTO schemas
- Rate limits on auth, checkout, payment, media, and search endpoints
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
