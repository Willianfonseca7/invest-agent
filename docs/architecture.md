# Invest-Agent 2.0 — Approved product direction

Status: design baseline, not implemented. Preserve existing React/TypeScript, Express, worker and npm workspace engines. Existing Binance adapter and Redis/local JSON persistence are starting points, not proof of production safety.

## Scope
Virtual investment company with autonomous discovery and paper trading for crypto and equities. Owner approves capital reallocations and strategy promotions, may edit proposals manually, and controls risk policy. No live orders in MVP. R&D department deferred.

## Agents
Nine roles: CEO (Willian), Market Scanner (Alex), Technical Analyst (Sofia), Research Analyst (Emma), Strategy Manager (Victor), Portfolio Manager (Leon), Risk Manager (Helena), Trader (Max), Auditor (Clara). Names are configurable proposed defaults; role IDs stable. Only CEO, Research and Strategy use LLMs on demand initially. Other roles deterministic. No LLM access to execution credentials or direct order submission.

## Proposed architecture
Typed event-driven orchestrator; shared market data and bounded queues; normalized asset identity, currency, venue, trading calendar and data freshness. Reuse existing strategy, capital, allocation, portfolio, risk and execution engines. Evaluate equities data providers for licensing, quotas and German availability before selection. Start locally; cloud deferred. AI budget target EUR 5/month, hard application-side reservation and accounting; stop LLM calls on exhaustion or unknown cost. No paid subscriptions without approval.

Risk checks deterministic and fail closed; atomic reservation and current portfolio state, idempotent orders, reconciliation, kill switch, bounded retries. Human approvals authenticated, scoped, expiring, audited and revalidated. Paper fills model fees, slippage and market hours. Learning means versioned evaluation and proposals, not autonomous production code or policy changes.

## Persistence
RAM for ephemeral states; reuse Redis only where useful. Durable transactional store required for ledger, approvals and audit; PostgreSQL candidate, not selected or provisioned. Measure queries, connections, storage and cache hits; bounded batches for noncritical telemetry, indexes and retention. Never discard evidence required to reproduce decisions. No raw chain-of-thought storage. Critical writes must be durable before acknowledgment; fail closed on unavailable persistence.

## UI
Command Center for portfolio, risk, approvals, costs and audit. Modern isometric 3D Office View, names, roles, departments and real event-driven activity. React Three Fiber/Three.js candidates; lazy-load and provide accessible lightweight fallback. No fabricated activity. Separate rendering from trading processes.

## Open decisions
Equities provider, initial capital/currency and universe, persistence migration, deployment and concrete resource limits require validation. No infrastructure or API purchases authorized by this document.
