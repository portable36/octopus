# Review Security Boundaries

Review the change in this order:

1. Untrusted inputs and parser/schema validation.
2. Authentication and authorization order.
3. Tenant/vendor/store ownership checks.
4. Secret, token, PII, and payment-data handling.
5. CORS, CSRF, rate limits, body limits, and timeouts.
6. Injection, unsafe redirects, file uploads, and untrusted HTML.
7. Replay, idempotency, race conditions, and auditability.
8. Negative tests and observability without sensitive data leakage.

Report findings as BLOCKER, HIGH, MEDIUM, or LOW with file references and a concrete remediation.
