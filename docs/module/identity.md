# Identity Module

## Responsibility

The Identity bounded context owns authentication credentials, user lifecycle, sessions, roles, permissions, and the security primitives other modules rely on for actor resolution.

Identity owns:

- User aggregate and account lifecycle
- Email and password credential handling (Argon2id hashing in domain/application boundary)
- Access and refresh token issuance, rotation, and revocation tracking
- Token family fraud detection and session invalidation
- Role and permission definitions used by authorization guards
- Password change, reset, and optional MFA enrollment flows
- OAuth/OIDC linkage metadata where enabled
- Account verification and lockout policy state

Identity does not own:

- Vendor or store business profiles
- Customer marketing preferences owned by Customer Experience
- Order, cart, payment, or catalog data
- Platform audit log storage (Audit module consumes Identity events)

Other modules receive a resolved authenticated principal and scoped authorization context. They must not read Identity persistence tables directly.

## Architecture

Follow Clean Architecture inside `backend/src/modules/identity/`:

```text
Presentation -> Application -> Domain
Infrastructure -> Application/Domain ports
```

Domain code is pure TypeScript. NestJS guards, JWT adapters, Redis revocation stores, and MikroORM entities belong in infrastructure.

## Key aggregates and value objects

### User

- Stable User ID (UUIDv7 via `UniqueId`)
- Email address value object with normalization and validation
- Password hash never exposed outside verification boundary
- Status: `PENDING`, `ACTIVE`, `LOCKED`, `DISABLED`
- Created/updated UTC timestamps and audit metadata

Mutations use intent methods: `register`, `activate`, `lock`, `changePassword`, `recordFailedLogin`.

### Session / token family

Refresh tokens rotate on use. Reuse of a revoked refresh token invalidates the entire token family. Access tokens remain short-lived and stateless where configured.

### JWT rules (Identity-owned)

- JWTs are not encryption; do not put PII (name, email, phone, address) in claims.
- Prefer **opaque tokens to clients** and short-lived JWTs only on trusted internal boundaries (phantom / split token).
- Pin verification `alg`; always validate `iss` and `aud`; keep access TTLs short.

See `SECURITY.md` and `.cursor/rules/04-security-authn.mdc`. **Current gap:** access JWTs still embed `email` — remove in a follow-up so claims match this contract.

## Authorization contract

Identity publishes role and permission catalogs. Application guards evaluate:

```text
PLATFORM_ADMIN > VENDOR_OWNER > VENDOR_STAFF > STORE_MANAGER > STORE_STAFF > CUSTOMER
```

Permissions are granular (`catalog.product.update`, `order.fulfill`, etc.). Role alone never bypasses vendor/store ownership checks performed in owning modules.

## Public contracts

- Resolve authenticated user by ID
- Validate credentials (login)
- Issue and revoke sessions
- Evaluate permission sets for a principal

Contracts return DTOs. Never expose password hashes, refresh token plaintext, or internal Redis keys.

## Events

```text
UserRegistered
UserActivated
UserLocked
PasswordChanged
SessionRevoked
TokenFamilyCompromised
```

Durable cross-module notifications use the transactional outbox.

## Validation and invariants

- Passwords validated against documented policy before hashing
- Email uniqueness enforced at application and database layers
- Failed login counters and lockout windows are deterministic
- Refresh token rotation is atomic with revocation list updates
- Never log passwords, refresh tokens, or raw JWT payloads

## Testing requirements

- Registration, activation, lockout, password change, and reset flows
- Token rotation, family reuse detection, and revocation
- Permission guard negative cases: wrong role, wrong tenant, wrong vendor, wrong store
- Concurrent refresh and replay attempts
- Argon2id verification isolated from transport layer

## Exit criteria

- User lifecycle and token rotation documented and implemented
- Authorization guards integrated with tenant context from Phase 02
- Negative security tests for cross-tenant access pass
- `npm.cmd run validate` passes

## Related

- [PHASES.md](../PHASES.md) — Phase 01
- [ARCHITECTURE.md](../../ARCHITECTURE.md)
- [SECURITY.md](../../SECURITY.md)
- `.cursor/rules/04-security-authn.mdc`
