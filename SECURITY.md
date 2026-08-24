# Security Baseline

## Authentication

- Access tokens are short-lived.
- Refresh tokens are rotated and revocable.
- Store refresh-token hashes, not reusable plaintext tokens.
- Prefer secure, HTTP-only, SameSite cookies for browser refresh tokens.
- Never put access or refresh tokens into URLs.
- Passwords use Argon2id with current recommended parameters for the deployment environment.
- MFA should be supported for privileged accounts.
- Admin/vendor authentication should have stronger controls than customer login.

### JWT practices

JWTs are Base64-encoded, not encrypted — assume claims are readable to the token holder.

- **No PII in tokens:** never embed name, email, phone, address, or similar PII. Use opaque identifiers only where needed; load profile data from Identity after auth.
- **Opaque outside / JWT inside (phantom / split token):** clients get opaque tokens (or HTTP-only cookies); short-lived JWTs stay on trusted internal hops behind the API gateway/BFF.
- **Pin `alg`:** verify with an allow-listed algorithm only; reject `none` and algorithm confusion.
- **Validate `iss` and `aud`:** reject missing or mismatched issuer and audience.
- **Short TTL:** keep access tokens measured in minutes; rotate and revoke refresh tokens as above.

Authoritative agent rule: `.cursor/rules/04-security-authn.mdc`.

## Authorization

Authorization is policy-based and deny-by-default.

Roles are coarse-grained:

```text
PLATFORM_ADMIN
VENDOR_OWNER
VENDOR_STAFF
STORE_MANAGER
STORE_STAFF
CUSTOMER
```

Permissions should be granular:

```text
catalog.product.read
catalog.product.create
catalog.product.update
inventory.adjust
order.read
order.fulfill
payout.read
payout.request
vendor.manage
store.manage
```

A role never bypasses ownership and tenant scope checks.

## Tenant isolation

Every repository query touching tenant-owned data must include tenant scope unless the repository is explicitly platform-global.

RLS policies must use a transaction/request-local tenant context.

Do not set a PostgreSQL session variable globally on a pooled connection without transaction scoping.

## Input security

- Validate all external input.
- Reject unknown fields where appropriate.
- Normalize identifiers.
- Allowlist sorting/filtering fields.
- Bound pagination.
- Limit body size.
- Sanitize or encode HTML according to rendering context.
- Never construct SQL from user strings.
- Never interpolate shell commands from user input.

## Web security

- Helmet.
- Strict CORS allowlist.
- CSRF protection when cookie-authenticated mutations are exposed cross-site.
- Secure cookies in production.
- HSTS after verifying deployment topology.
- Content Security Policy appropriate to the application.
- Rate limits for authentication, password reset, checkout, payment endpoints, and expensive searches.

## Secrets

Secrets must come from the deployment secret manager/environment.

Never commit:

- private keys
- payment secrets
- JWT signing keys
- database passwords
- cloud credentials
- API keys

Provide `.env.example`, never `.env`.

## Logging

Never log:

- passwords
- access tokens
- refresh tokens
- authorization headers
- payment credentials
- full card numbers
- CVV
- sensitive personal data unnecessarily

Use structured logs with request ID, actor ID where appropriate, tenant/vendor/store IDs where safe, operation, duration, outcome, and error code.

## Webhooks

Webhook endpoints are public attack surfaces.

Require:

- signature verification
- timestamp/replay protection where supported
- strict payload validation
- idempotency
- provider event ID uniqueness
- **provider transaction ID, response code, and timestamp stored** on every handled event
- transactionally consistent state changes
- audit trail

## Financial operations

Backend payment handling (see `.cursor/rules/08-payments-finance.mdc`):

- Idempotency key on every payment request and callback
- Integer minor units only — never float/double for money
- Never debit without guaranteed credit; use Sagas with compensating actions across boundaries
- Persist gateway transaction ID, response code, and timestamp
- Reconciliation against provider reports is mandatory, not optional

## File uploads

Media and asset uploads follow direct-to-storage design (see `.cursor/rules/38-media-uploads.mdc`):

1. **Never upload through the backend** — issue short-lived presigned credentials; clients PUT to object storage (MinIO/S3/R2).
2. **Validate type by content** — inspect magic bytes / file headers server-side; extension and client MIME are not authoritative.
3. **Multipart uploads** for large objects; generate object keys server-side; do not trust client filenames.
4. **Resumable uploads** — support resume of interrupted multipart sessions; expire and clean abandoned uploads.
5. **Process async** — virus scan, variants, and indexing via queues after the object lands; API only tracks session/status.
6. **Rate limit and size limits** — enforce max size, parts, and upload rate per actor/tenant.

Also:

- Private buckets by default
- Signed download URLs for controlled access
- Quarantine until validation/scan passes
- Scan where business risk requires it
- Never trust client filenames or public URLs as source of truth (store media IDs)
