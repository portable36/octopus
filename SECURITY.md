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
- transactionally consistent state changes
- audit trail

## File uploads

- Validate MIME type and extension.
- Enforce size limits.
- Generate object keys server-side.
- Do not trust client filenames.
- Scan where business risk requires it.
- Use private buckets by default.
- Use signed URLs for controlled access.
