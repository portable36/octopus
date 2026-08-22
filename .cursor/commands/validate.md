# Validate Repository

Run the production validation pipeline.

```bash
npm run validate
```

If it fails:

1. Fix the first deterministic failure.
2. Re-run the smallest relevant check.
3. Re-run the full validation before finishing.
4. Never hide a failure by weakening a test or lint rule.
