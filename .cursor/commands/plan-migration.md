# Plan A Database Migration

Before editing schema:

1. Identify the owning bounded context and current schema contract.
2. State the data invariant and why application-only enforcement is insufficient.
3. Choose expand/contract steps for rolling deployment compatibility.
4. Specify indexes, constraints, lock risk, backfill strategy, and tenant scope.
5. Define clean-database and upgrade-database verification.
6. Document rollback or forward-recovery behavior.
7. Review generated SQL before applying it.

Never edit an applied migration or include production data and secrets.
