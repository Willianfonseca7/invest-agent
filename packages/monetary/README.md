# Monetary precision foundation (Roadmap Stage 4)

This isolated backend workspace implements the BR-CAP-001 **configurable initial capital validation contract** and BR-PST-001 exact arithmetic boundaries. It creates no portfolio, funding transaction, posting, or database schema. It does not integrate with the existing number-based shared types or engines, which still round with `toFixed(2/8)`. No legacy balance or order path uses this package.

## Contract and limits

`validateInitialCapital(amount)` validates an explicit positive decimal string as EUR initial capital for one new paper portfolio. Examples include `"50"`, `"100"`, `"200"` and `"300"`. The function applies no default, rounding or business maximum. It uses the same technical decimal envelope as other monetary inputs. The Product Owner must explicitly select the amount. Authorization and persistence are integration requirements. Available balance will be derived from accounting records, and additional contributions will require Product Owner authorization and auditable records.

Inputs and outputs are canonical finite plain decimal strings. JavaScript numbers, exponents, whitespace, signed plus, and invalid values are rejected. Codes are uppercase and USD and USDT remain distinct. Amounts, prices, quantities, quantity increments, unit costs, and FX rates have separate constructors. Money carries currency; prices and unit costs carry base and quote asset codes. Addition and subtraction require identical currencies. Price × quantity requires the base asset to match. Currency conversion requires a supplied directional positive rate, nonempty source, UTC observation and validity timestamps, and a caller supplied UTC evaluation time. Missing, reversed, future or expired FX fails. There is no implicit provider, parity, inverse rate or accounting scale.

The technical resource envelope admits up to 80 coefficient digits, 80 integer digits, and 40 fractional digits per value, with an input length cap of 202 characters. Results outside the same envelope reject. The private `decimal.js` clone uses 256 significant digits. Addition, subtraction and multiplication of admitted inputs have bounded exact intermediates below that precision. Buy sizing uses `dividedToIntegerBy`; its integer quotient has at most 160 digits, so precision cannot round that quotient. Price tick divisibility uses exact modulo, whose integer quotient has at most 120 digits. No arithmetic step is rounded by the configured capacity within these bounds. Accounting rounding is a separate caller invoked `ROUND_HALF_EVEN` operation with scale 0–40. Instrument quantity and price increments are independent of that scale. There is no implicit market scale or FX precision policy. An unsupported magnitude or result is an explicit error, not a rounded value.

`floorBuy` requires a quote budget, execution price, caller supplied positive price tick with matching base and quote units, quantity increment, fixed quote currency cost and nonnegative quote currency cost per base unit. It rejects an execution price that is not an exact multiple of the tick; it does not replace that price or select an instrument policy. It floors to an integral number of quantity increments, checks the exact gross plus both costs against the budget, and returns quantity, gross, cost, total and remainder as decimal strings. A budget below fixed cost or unable to buy one increment throws `Insufficient`. A zero denominator is explicitly rejected. It does not model percentage fees, minimum order size, liquidity, spread or slippage; callers must supply the applicable execution price and costs after those policies are approved. It does not authorize an order.

`amount` strings are suitable for a future PostgreSQL `NUMERIC` parameter and for lossless JSON serialization. No driver, schema, persistence, migration or live writer is introduced. A future integration must validate values again on input, use an approved column envelope and transactional ledger, and prove no older number conversion occurs.

## Dependency and decision gate

`decimal.js-light` 2.5.1 is MIT and already appears transitively in the lockfile. Its documented arithmetic truncates at configured precision. Full `decimal.js` 10.6.0 is MIT, has no dependencies, supports a private clone and explicit `ROUND_HALF_EVEN`, and declares no Node engine restriction. The isolated install and tests passed on local Node 24; CI Node 22 verification remains pending. It adds one direct runtime package. No paid service is involved. Removal is limited to this workspace and its lock entries because no consumer is wired.

**BLOCKED for integration:** Product Owner decisions are still needed for FX source and conversion rules, approved instrument precisions and increments, accounting scale per currency, execution cost assumptions, and legacy balance reconciliation. Stage 5 PostgreSQL and later execution integration have separate gates. Portfolio creation, idempotent opening records, authorization and ledger-derived balances remain dependent on future integration. Any additional business limits require Product Owner approval.

## Local performance baseline

Recorded on 2026-11-27 with Node 24.18.0, npm 11.16.0, macOS 15.6.1 arm64, using `performance.now()` in an isolated temporary copy with `decimal.js` 10.6.0. Measured `src/index.ts` revision before the initial capital policy adjustment, SHA-256: `6eb6d1f38882813af6e3eaafc0e7fdbbc3e5873cdb9be8b3ac47ba1e29031eb6`. Each workload used prebuilt inputs, 1,000 warmup iterations and 10,000 measured iterations in one process:

| Workload | Total | Mean per operation |
|---|---:|---:|
| Exact EUR `0.1 + 0.2` | 18.060 ms | 0.001806 ms |
| Directional USD→EUR FX `10 × 0.9` | 36.187 ms | 0.003619 ms |
| Buy sizing with price `3.33`, tick `0.01`, quantity increment `0.01`, fixed cost `0.10` and unit cost `0.02` | 103.919 ms | 0.010392 ms |

These single-run measurements are a local source baseline, not latency targets. Base revision `4ba60ecbbd70841e5463a5d7e14c8acf6913167e` has no equivalent decimal operation for a like-for-like comparison. This baseline cannot estimate database, worker or order latency.
