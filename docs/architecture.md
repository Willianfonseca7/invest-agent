# Invest-Agent 2.0 — Approved product direction

Status: design baseline. [Business rules](business-rules.md) define normative product behavior. See their implementation notes for known legacy divergences. Preserve existing React/TypeScript, Express, worker and npm workspace engines. Existing Binance adapter and Redis/local JSON persistence are starting points, not proof of production safety.

## Scope
Virtual investment company with autonomous discovery and paper trading. See BR-MKT-001, BR-EXE-001 and BR-HUM-001 for asset rollout, execution scope and Product Owner authority. R&D department deferred.

## Agents
Nine roles: CEO (Willian), Market Scanner (Alex), Technical Analyst (Sofia), Research Analyst (Emma), Strategy Manager (Victor), Portfolio Manager (Leon), Risk Manager (Helena), Trader (Max), Auditor (Clara). Names are configurable proposed defaults; role IDs stable. Only CEO, Research and Strategy use LLMs on demand initially. Other roles deterministic. No LLM access to execution credentials or direct order submission.

## Proposed architecture
Typed event-driven orchestrator; shared market data and bounded queues; normalized asset identity, currency, venue, trading calendar and data freshness. Reuse existing strategy, capital, allocation, portfolio, risk and execution engines. Evaluate equities data providers for licensing, quotas and German availability before selection. Start locally; cloud deferred. Use application-side reservation and accounting for the product AI budget defined in BR-AI-001. No paid subscriptions without approval.

Risk checks deterministic and fail closed; atomic reservation and current portfolio state, idempotent orders, reconciliation, kill switch, bounded retries. Human approvals authenticated, scoped, expiring, audited and revalidated. Paper fills model fees, slippage and market hours. Learning means versioned evaluation and proposals, not autonomous production code or policy changes.

## Persistence
RAM for ephemeral states; reuse Redis only where useful. Durable transactional store required for ledger, approvals and audit; PostgreSQL selected as the target financial source of truth, not yet provisioned or integrated. Redis is auxiliary only; JSON is legacy/import or fixture only. No fallback financial writes. Measure queries, connections, storage and cache hits; bounded batches for noncritical telemetry, indexes and retention. Never discard evidence required to reproduce decisions. No raw chain-of-thought storage. Critical writes must be durable before acknowledgment; fail closed on unavailable persistence.

## UI
Command Center for portfolio, risk, approvals, costs and audit. Modern isometric 3D Office View, names, roles, departments and real event-driven activity. React Three Fiber/Three.js candidates; lazy-load and provide accessible lightweight fallback. No fabricated activity. Separate rendering from trading processes.

## Open decisions
Equities provider, instrument universe, precision policy, database driver/ORM, persistence migration, deployment and concrete resource limits require validation. No infrastructure or API purchases authorized by this document.

## Engineering boundaries and operational finance
Keep React presentation, layouts, reusable components, feature hooks, API services, state and domain rules separate. Office and Command Center share domain contracts and services. Use pragmatic TypeScript with runtime validation at trust boundaries; avoid unnecessary abstractions and duplicated logic.

Development agents operate outside the product and its AI budget. See BR-CAP-001, BR-AI-001, BR-FIN-001 and BR-LRN-001 for accounting, AI limits, cost coverage and strategy promotion. The AI budget split remains open.

## Approved revision after independent review
Use a modular TypeScript architecture with existing API and worker entrypoints, six deterministic services and three on-demand LLM roles through a shared gateway. Preserve nine named roles in UI, backed by real events. Crypto implementation precedes equities; both remain in scope. PostgreSQL transactions must bind immutable decisions, risk revision, orders, positions, append-only ledger and durable event outbox. Use NUMERIC and exact decimal arithmetic, explicit currency/asset precision and rounding. Derive balances from ledger or reconciled projections. No external API call inside a financial transaction.

Backtest and paper execution share strategy/risk logic with injected clock and data source. Compare net results against buy-and-hold, equal-weight and seeded random baselines with realistic fees, spread, slippage, liquidity and minimum orders. Prevent lookahead and survivorship bias; use walk-forward and untouched final evaluation, log all trials. No forced trade count or profit target. Clara verifies evidence; owner approves promotion. Dependency audit and tested kill switch precede agent expansion.
