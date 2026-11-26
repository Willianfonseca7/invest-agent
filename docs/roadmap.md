# Invest-Agent 2.0 — Incremental roadmap

Approved revision 2026-11-26. Foundation partially implemented; later phases pending. Each PR requires review, relevant tests, rollback plan and explicit owner approval before merge.

1. Foundation & Security: retain live-order block and existing CI protections; audit dependencies, implement tested kill switch, define exact monetary precision and PostgreSQL schema, atomic execution/idempotency, reconciliation and migration plan. Gate: actual database concurrency, restart and failure tests pass; no real orders.
2. Backtesting & Evaluation (foundation exit gate): shared strategy/risk logic, injected clock, realistic fees/spread/slippage/liquidity, seeded baselines, walk-forward and untouched holdout, trial registry and reproducible metrics. Gate: evaluation correctness demonstrated; unproven strategies cannot be promoted.
3. Multi-Agent Core & Intelligence: six deterministic services, three bounded LLM roles, nine visible identities, typed events, durable outbox, permissions, EUR 5 budget gateway, schema validation and independent strategy verification. Gate: replay, risk veto, budget exhaustion and malformed response tests.
4. Multi-Asset: crypto first; equities remain in scope. Normalize instruments, currencies, quotes, calendars and corporate actions; evaluate provider licensing and quotas. Gate: fixtures and paper execution tests for both classes.
5. Command Center: real agent events, authenticated approvals, portfolio, risk, audit, realized PnL, fees, expenses, tokens and cost coverage. Shared UI services and i18n. Gate: E2E authorization and approval tests.
6. Office View: lazy-loaded isometric 3D, real events and accessible fallback; measured browser performance. Gate: no fabricated activity.
7. Validation & Paper Trading: prolonged multi-regime paper testing, reconciliation, recovery drills, load tests and security review. Cloud only after cost approval; live trading excluded.

Initial paper capital EUR 100; cost coverage is a KPI, never a reason to force trades or increase risk. No automatic capital increases. Rollback: additive migrations, tested backup/restore, no destructive ledger rollback. No deployment or migration without separate approval.
