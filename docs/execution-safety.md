# Persistent paper execution safety

Status: design gate; no runtime guarantees added by this document.

## Existing storage and risks
Positions are a Redis JSON value or positions.json; the ledger is a Redis list or trades.json. Writes are separate. The ledger retains 500 entries, and local readers currently swallow all read errors. In-memory symbol guards do not survive restarts. A symbol lock alone cannot protect portfolio-wide capital limits.

## Required transaction contract
- Stable intent ID derived from immutable decision identity, not generated on retry. Include createdAt, expiresAt, expected position orderId (SELL), expected portfolio revision, and strategy version.
- Reject expired uncommitted, conflicting or stale intents; lookup of a committed identical intent returns the recorded result without changing state.
- Atomically validate revision and position identity, commit position transition, append ledger, record intent result, and update cumulative realized PnL. Revalidate portfolio risk against the same revision; a conflict requires a fresh decision.
- PostgreSQL implementation: one transaction with unique intent identity, portfolio revision and row locking or equivalent serializable concurrency control; atomically persist order, position, append-only ledger, receipt and outbox. Obtain quote before transaction and reject stale quote. No external network call inside transaction.
- PostgreSQL is the sole target financial source of truth. Redis and JSON are not fallback financial writers. Use exact decimal arithmetic and NUMERIC with explicit currency/asset precision; derive totals from ledger or reconciled projections. Legacy writers must be stopped before cutover.
- Preserve cumulative financial totals independently of bounded recent-history display. Never silently reconstruct lifetime PnL from a truncated ledger.
- Existing state migration must be explicit, versioned, validated and reversible; do not reset or overwrite existing financial state. If historical totals cannot be recovered, stop and request owner reconciliation.
- Retain durable unique intent identities and receipts with financial audit evidence; reject expired uncommitted intents and conflicting replays. Define receipt lookup separately from new execution. Monitor storage and request consumption.

## Delivery gates
1. Define typed intent and transaction interface; test stale position and expiry.
2. Design schema and implement PostgreSQL atomic commit; test actual database concurrency and restart behavior, not mocks alone.
3. Integrate worker risk revision and execution; migrate readers and reconcile legacy ledger.
4. Verify duplicate replay, competing workers on same and different symbols, stale revisions, expiry, restart, ambiguous response after commit, unavailable database, corrupt legacy import and migration rollback.
5. Owner reviews migration and deployment separately. Live trading remains prohibited.

No paid services or new infrastructure authorized. No deployment or migration in this design PR.
