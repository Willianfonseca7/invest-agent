# Invest-Agent 2.0 — Incremental roadmap

All phases pending. Each PR requires review, relevant tests, rollback plan and explicit owner approval before merge.

1. Foundation & Security: inspect config, worker, execution, persistence and CI; prevent live execution in MVP, test fail-closed behavior; verify stale portfolio snapshot and overlapping-worker risks; add atomic reservations/idempotency/reconciliation design. Correct README discrepancies after verification. Gate: no real orders possible in MVP, concurrency and failure tests pass.
2. Multi-Agent Core: typed events, stable agent IDs, state transitions, permissions, bounded orchestration; deterministic agents first. Gate: replayable cycle and risk veto tests.
3. Multi-Asset: normalized instrument and quote contracts, crypto adapter compatibility, equities provider evaluation, market calendar and currency handling. Gate: fixtures and paper execution tests for both asset classes.
4. Intelligence & Memory: bounded LLM calls, schema validation, untrusted content isolation, budget reservations, deduplication, retention, versioned strategy proposals and human approval. Gate: budget exhaustion, malformed response, stale approval and database outage tests.
5. Command Center: authenticated approvals, resource metrics, portfolio and audit views; preserve i18n. Gate: E2E authorization and approval tests.
6. Office View: lazy-loaded 3D scene with actual agent events, accessible fallback and measured browser performance. Gate: no invented activity, resource budgets measured.
7. Validation & Deployment: backtesting without lookahead, paper trading with fees/slippage, recovery drills, load tests and security review. Cloud only after cost approval; live trading excluded.

Rollback: keep each phase independently revertible; additive migrations with tested backup/restore; disable new features by default until validated. No destructive rollback of ledger or audit data.

## Approved refinements
- Foundation: follow docs/execution-safety.md; durable idempotency, atomic portfolio revision and financial reconciliation remain pending. No runtime safety claim from documentation.
- Multi-Agent and Intelligence: deterministic roles first; shared evidence, event-driven LLM calls, EUR 5 monthly application budget and independent Clara verification. Test budget exhaustion and strategy promotion gates.
- Command Center: add financial control metrics (realized PnL, fees, operating expenses, token spend, cost coverage, reserves); share reusable UI and domain services with Office View. Initial paper capital EUR 100; no forced trading or automatic capital increases.
