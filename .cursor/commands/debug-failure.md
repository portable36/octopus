# Debug A Failure

Use this sequence:

1. Capture the exact command, input, environment, and first deterministic failure.
2. Inspect the owning code path and nearest test.
3. State one falsifiable root-cause hypothesis.
4. Run the cheapest check that can disconfirm it.
5. Make the smallest fix at the controlling abstraction.
6. Add a regression test.
7. Re-run the focused check, then `npm.cmd run validate`.
8. Summarize root cause, fix, residual risk, and any unavailable external verification.
