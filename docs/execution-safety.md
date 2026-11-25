# Persistent paper execution safety

Status: design gate; no runtime guarantees added by this document.

## Existing storage and risks
Positions are a Redis JSON value or positions.json; the ledger is a Redis list or trades.json. Writes are separate. The ledger retains 500 entries, and local readers currently swallow all read errors. In-memory symbol guards do not survive restarts. A symbol lock alone cannot protect portfolio-wide capital limits.

## Required transaction contract
- Stable intent ID derived from immutable decision identity, not generated on retry. Include createdAt, expiresAt, expected position orderId (SELL), expected portfolio revision, and strategy version.
- Reject expired, conflicting or stale intents; replay of a committed identical intent returns the recorded result without changing state.
- Atomically validate revision and position identity, commit position transition, append ledger, record intent result, and update cumulative realized PnL. Revalidate portfolio risk against the same revision; a conflict requires a fresh decision.
- Redis implementation: one Lua script, with all keys in the same hash slot where required. No external network call inside the transaction. Obtain paper quote before commit; reject stale quote. No expiring lock is relied upon for correctness.
- Local implementation: single durable state file with exclusive interprocess coordination and atomic replacement; fail closed on corrupt or unreadable state. Until implemented and tested, local multi-process execution must not be enabled.
- Preserve cumulative financial totals independently of bounded recent-history display. Never silently reconstruct lifetime PnL from a truncated ledger.
- Existing state migration must be explicit, versioned, validated and reversible; do not reset or overwrite existing financial state. If historical totals cannot be recovered, stop and request owner reconciliation.
- Retain intent records at least through their validity window plus clock-skew allowance; expired intents must remain rejected even after record pruning. Monitor storage and request consumption.

## Delivery gates
1. Define typed intent and transaction interface; test stale position and expiry.
2. Implement Redis atomic commit and local durable adapter; test actual storage concurrency and restart behavior, not mocks alone.
3. Integrate worker risk revision and execution; migrate readers and reconcile legacy ledger.
4. Verify duplicate replay, competing workers on same and different symbols, stale revisions, expiry, restart, ambiguous response after commit, unavailable storage, corrupted local file and migration rollback.
5. Owner reviews migration and deployment separately. Live trading remains prohibited.

No paid services or new infrastructure authorized. No deployment or migration in this design PR.
