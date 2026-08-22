# Add Focused Tests

For the requested behavior:

1. Find the lowest layer that owns the invariant.
2. Add a test for the happy path.
3. Add invalid input and authorization-negative cases.
4. Add duplicate/retry and concurrency cases when mutation is involved.
5. Add integration coverage for database, queue, provider, or transaction semantics that mocks cannot prove.
6. Run the narrow test command immediately.
7. Run `npm.cmd run validate` before completion.

A test must assert behavior and failure semantics, not implementation trivia.
