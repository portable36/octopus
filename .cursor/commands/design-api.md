# Design An API Contract

Before implementation, produce a concise contract covering:

- route and version
- actor and tenant/vendor/store scope
- authentication and authorization
- request DTO and validation limits
- response DTO and status codes
- stable error codes
- pagination/filter/sort behavior
- idempotency requirements
- audit and observability fields
- unit, integration, and negative tests

Check compatibility with existing routes and documentation. Then implement the smallest vertical slice and run the focused tests before the full validation gate.
