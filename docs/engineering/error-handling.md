# Error Handling

## API errors

Use RFC 7807 Problem Details for HTTP errors. Stable `type` and `title` fields; human-readable `detail` without stack traces or secrets.

## Application errors

Define domain-specific error codes per module (`CATALOG_SKU_DUPLICATE`, `ORDER_INVALID_TRANSITION`, `POS_SALE_ALREADY_COMPLETED`). Map them to HTTP status in presentation layer only.

## Wrapping

Preserve original error causes when wrapping. Do not swallow exceptions without documented reason.

## Client vs server faults

- **4xx**: validation, authorization, conflict, not found
- **5xx**: unexpected failures; log with correlation ID

## Retry semantics

Document which operations are safe to retry. Mutations that are not idempotent must require `Idempotency-Key`.

## Related

- [coding-standards.md](./coding-standards.md)
- [SECURITY.md](../../SECURITY.md)
- `.cursor/rules/10-api-contracts.mdc`
- `.cursor/rules/26-api-contract-design.mdc`
