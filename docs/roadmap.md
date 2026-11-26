# Invest-Agent 2.0 — Incremental roadmap

Follow the [business rules](business-rules.md) for normative product behavior. The foundation remains partial. Each PR requires review, relevant tests, a rollback plan and explicit owner approval before merge. Critical security remediation can proceed whenever needed and does not wait for documentation.

1. **Business Rules.** Record approved behavior, open decisions and known legacy divergences. Gate: technical review and Product Owner approval of the baseline.
2. **Runtime Safety.** Retain live-order blocks and existing CI protections. Verify executable artifacts, fail closed on unknown dependencies and test fault boundaries. Gate: no real orders and proven rejection of invalid execution state.
3. **Dependency Security.** Audit dependencies, triage results and confirm verification in CI. Gate: resolve release-blocking findings before expanding agents.
4. **Kill Switch.** Implement and test the operating states and recovery requirements in BR-EXE-002. Gate: validate allowed and rejected paths and recovery authorization before expanding agents.
5. **Monetary Precision.** Define EUR accounting, exact decimal representations and explicit units and rounding. Gate: verify decimal and conversion boundaries against approved policy.
6. **PostgreSQL Foundation.** Implement atomic execution, durable idempotency, outbox and ledger. Gate: actual database concurrency, restart and failure tests pass.
7. **Financial Reconciliation.** Reconcile legacy positions and ledger with explicit migration and rollback plans. Gate: balances reconcile, backup and restore are tested, and the Product Owner approves migration separately. Use additive migrations and preserve financial history during rollback.
8. **Backtest Engine.** Apply BR-BKT-001. This is the foundation exit gate. Demonstrate reproducible evaluation and require independent evidence before promotion.
9. **Multi-Agent Core.** Use typed events, durable outbox, scoped permissions, the bounded AI gateway and independent strategy verification. Gate: replay, risk veto, budget exhaustion and malformed response tests.
10. **Multi-Asset.** Crypto first, followed by equities. Normalize instruments, currencies, quotes, calendars and corporate actions. Evaluate vendor licensing and quotas. Gate: fixtures and paper execution tests for both classes.
11. **Command Center.** Use real agent events and authenticated approvals. Present portfolio, risk, audit, realized PnL, fees, expenses, token usage and cost coverage with shared services and i18n. Gate: E2E authorization and approval tests.
12. **Office View.** Lazy-load an isometric 3D view with accessible fallback and measure browser performance. Gate: every activity shown has a real product event.
13. **Prolonged Paper Trading Validation.** Exercise multiple regimes, reconciliation, recovery drills, load tests and security review. Keep live trading excluded. Cloud, deployment and migration require separate approval.
