# Invest-Agent 2.0 — Business rules

This is the normative product behavior reference. The Product Owner approved the Business Rules Foundation decisions after the Business Rules Audit of `67653f44f1e85f3600b5a75bce926a9c1455d849`. The [approved architecture](architecture.md), [execution safety design](execution-safety.md) and [roadmap](roadmap.md) describe the implementation target and delivery gates.

**Approved rule** identifies a product decision. **Architecture target** identifies an approved design obligation whose implementation may still be pending. **Implementation** describes the audited source, including legacy behavior. Open values and proposals require separate decisions. This document changes no runtime behavior.

## BR-CAP — Capital

### BR-CAP-001 — Accounting capital
- **Rule and authority.** Capital is the central product domain. Preserve it and seek risk-adjusted growth within approved policy. EUR is the accounting currency. The Product Owner explicitly selects positive decimal initial virtual capital for each new paper portfolio. Apply no default. Any additional business limits require Product Owner approval. Derive available balance from accounting records and prohibit manual balance adjustments. Additional contributions require Product Owner authorization and auditable accounting records. The Product Owner approves conversion policy.
- **Decision source.** Business Rules Foundation decisions 1 and 5, amended by the Product Owner’s configurable initial capital decision in PR #26.
- **Invalid state and acceptance.** An unknown currency, missing required conversion or unreconciled balance blocks a dependent operation. Missing, invalid or nonpositive initial capital blocks creation. EUR 50, 100, 200 and 300 are valid examples. A fresh portfolio has one opening record for the amount explicitly approved. Restarting does not add capital. Foreign quotes carry their currency and require approved conversion before affecting EUR totals.
- **Implementation.** The monetary foundation validates an explicit positive EUR decimal. Portfolio creation, approval enforcement, auditable contributions and accounting-derived balances await persistence and integration. The legacy Worker still defaults to 1,000 USDT and derives cash from retained trades, which conflicts with this rule. FX source, conversion rules and legacy balances remain open.

## BR-ALL — Allocation

### BR-ALL-001 — Allocation within approved policy
- **Rule and authority.** Routine allocations may use available capital within the approved policy. Changes to allocation policy, approved capital, or capital reallocations outside its mandate require Product Owner approval. The Risk Engine retains veto authority.
- **Decision source.** Business Rules Foundation decision 5 and the approved architecture scope.
- **Invalid state and acceptance.** A missing policy, stale portfolio revision or unknown available balance blocks dependent allocation. An eligible allocation stays within approved capital and limits. An out-of-policy reallocation has no financial effect before approval.
- **Implementation.** Partial. Legacy equal-weight allocation excludes open positions and applies an optional cap. No durable approval or atomic reservation binds the plan to its state.

## BR-MKT — Markets and assets

### BR-MKT-001 — Eligible assets and validated observations
- **Rule and authority.** Paper trading starts with crypto. Equities follow after their scope and data provider are approved. Backend maintains the instrument and data contract under Product Owner policy. The contract identifies instrument, venue, currency and observation time.
- **Decision source.** Business Rules Foundation decisions 6 and 8 and the approved multi-asset architecture.
- **Invalid state and acceptance.** Invalid, expired or unknown inputs block dependent operations. Tests distinguish unsupported instruments, malformed data, expired quotes and valid crypto observations. An equities instrument cannot enter the executable universe before its gate.
- **Implementation.** Partial. The Worker uses a fixed crypto list and Binance data. Eligibility metadata and complete schema and freshness checks remain pending.

## BR-STR — Strategies

### BR-STR-001 — Versioned signals and decision provenance
- **Rule and authority.** An approved strategy produces versioned signals with reasons and attributable source data. Signals are inputs to risk evaluation and execution. Backend owns the decision contract. Frontend displays the decision supplied by the backend.
- **Decision source.** Business Rules Foundation decisions 4, 6 and 7 and the approved architecture.
- **Invalid state and acceptance.** Missing or invalid inputs prevent a dependent decision. Unavailable data appears as unavailable in the UI, with no fabricated BUY, SELL or HOLD. Tests cover valid signal replay, invalid payloads and stale responses after instrument selection changes.
- **Implementation.** Partial. A deterministic analyzer exists. Strategy version provenance and frontend runtime validation are incomplete. The legacy UI can substitute HOLD when a response is invalid.

## BR-RSK — Risk

### BR-RSK-001 — Deterministic veto and policy validation
- **Rule and authority.** The deterministic Risk Engine can veto any proposed financial operation. Risk parameters are configurable, validated and tested by reproducible backtesting before promotion. The Product Owner approves the policy and its changes.
- **Decision source.** Business Rules Foundation decisions 4–6 and the approved risk architecture.
- **Invalid state and acceptance.** An invalid policy, unresolved capital, invalid required data, stale state or veto prevents execution. Tests show an over-limit request is vetoed, permitted decisions retain their policy version, and unvalidated configurations cannot be promoted.
- **Implementation.** Partial. Entry guards exist. Current defaults are legacy values, with no durable policy approval or backtesting gate.

## BR-PFO — Portfolio

### BR-PFO-001 — Reconciled positions, balances and metrics
- **Rule and authority.** Backend derives balances and positions from the permanent ledger or reconciled projections. Realized results, unrealized valuation and portfolio exposure have explicit bases and revisions.
- **Decision source.** Business Rules Foundation decisions 1, 3 and 6 and the approved architecture revision.
- **Invalid state and acceptance.** Unknown or inconsistent balances block dependent operations. Unavailable marks are identified as such. Tests reconcile the portfolio to the ledger, verify stale-revision rejection and confirm that changing the history display window leaves the underlying balance unchanged.
- **Implementation.** Partial. Position and PnL engines exist, but API and Worker can use different risk bases and the Worker reconstructs cash from retained trades.

### BR-PFO-002 — Financial performance tracking
- **Rule and authority.** Track configurable initial capital, additional contributions, withdrawals, available balance, invested capital, total equity, realized and unrealized PnL, trading costs, and real AI and infrastructure expenses as distinct concepts. Contributions and withdrawals are external capital flows and are excluded from PnL. Available balance and equity derive from official records and reconciled valuations. Keep backtest and paper results separate from real operating expenses, including when comparing them under BR-FIN-001.
- **Operation contract.** Retain a stable operation identifier, asset, market and currency, traded quantity, entry and exit prices and timestamps, each partial fill, applicable fees and costs, gross and net PnL, percentage return, strategy and version, and linked decisions and recorded rationale. Preserve original amounts and currencies alongside their EUR equivalents and traceable FX evidence. Acquisition cost basis and lot matching require Product Owner approval before use in confirmed realized results.
- **Reporting contract.** Support operation, position, asset, asset class, strategy and portfolio views for a selected period or the full history. Preserve dated external cash flows and valuation history for future time-weighted return (TWR), money-weighted return (MWR), Win Rate, Profit Factor and Maximum Drawdown. Use deterministic calculations on official records with explicit valuation basis, cutoff, revision and completeness. Count each fill, fee, cost and result once across the selected aggregation boundary. Missing, stale, invalid or unreconciled inputs must identify affected results as unconfirmed or unavailable.
- **Decision source.** Product Owner approval of Financial Performance Tracking before Stage 5.
- **Invalid state and acceptance.** Fixtures cover deposits and withdrawals without PnL, entry and exit with partial fills, full reconciliation including corrections and costs, missing marks or FX, and period reporting without changing the underlying balances. A replay over the same records and inputs reproduces the same results.
- **Implementation.** Target contract. Persistent tracking and authoritative reports are pending the roadmap stages.

## BR-EXE — Execution

### BR-EXE-001 — Paper-only execution
- **Rule and authority.** The MVP permits virtual orders only. The execution layer enforces a valid intent, current policy, risk verdict and kill-switch state. An LLM has no direct order authority.
- **Decision source.** Approved MVP scope and Business Rules Foundation decisions 2, 5 and 6.
- **Invalid state and acceptance.** Real order requests, unsupported modes, invalid quotes and unresolved execution state fail before financial effects. Test all mode boundaries and verify the deployed artifact independently of the source checks.
- **Implementation.** The source blocks live orders and supports virtual fills. Full intent and quote validation is pending. Stale local bundles remain a separate safety blocker.

### BR-EXE-002 — Kill switch
- **Rule and authority.** The Product Owner owns the operating-state policy and authorizes recovery from HALTED. The state gate applies before financial effects.

| State | Allowed behavior |
|---|---|
| RUNNING | Paper operations within approved policy, subject to risk and data validation. |
| PAUSED | Block new entries. Permit only protective exits when required data and financial state are valid. |
| HALTED | Block all financial operations. Permit investigation, reads and reconciliation. Returning to operation requires human authorization and verified integrity. Reconciliation establishes and reviews evidence here. A financial write remains blocked while HALTED. |

- **Decision source.** Business Rules Foundation decision 2.
- **Invalid state and acceptance.** Missing or unknown state blocks financial operations. State-transition tests cover entries and protective exits in each state, invalid data during PAUSED, and rejected recovery from HALTED without both authorization and integrity evidence.
- **Implementation.** Missing. Existing execution modes and loss guards do not implement these operating states.

## BR-PST — Persistence

### BR-PST-001 — Permanent ledger and exact accounting
- **Rule and authority.** PostgreSQL is the target source of financial truth. Monetary operations use exact decimal arithmetic with explicit currency, asset precision and rounding. The ledger is permanent and append-only, with no automatic deletion of postings. Corrections append traceable adjustment or reversal records linked to the original records and preserve the audit history. Backend owns consistency and storage. The Product Owner approves migration and reconciliation.
- **Decision source.** Business Rules Foundation decisions 1, 3 and 6 and the approved architecture revision.
- **Invalid state and acceptance.** Unavailable or corrupt financial storage blocks affected writes without falling back to Redis or JSON. Tests prove that retention limits on display data leave financial history and balances intact and that exact-decimal arithmetic follows approved precision.
- **Implementation.** Conflicting legacy behavior. Redis or JSON stores financial state, some failed reads yield empty state, the trade ledger is bounded, and calculations use floating point.

### BR-PST-002 — Atomic application and durable idempotency
- **Rule and authority.** Persist decision, risk revision, order, position, ledger entry, durable receipt and outbox consistently within the same financial transaction. Identical committed intents return the existing receipt. Stale, expired or conflicting intents cannot write. Backend enforces the transaction boundary.
- **Decision source.** Business Rules Foundation decision 6 and the [execution safety transaction contract](execution-safety.md).
- **Invalid state and acceptance.** If commit certainty or current revision is unknown, resolve it through durable receipt lookup or reconciliation before retrying. Test concurrent workers, stale positions, failures between writes, restarts and ambiguous responses after commit against actual persistence.
- **Implementation.** Pending. Position and ledger writes are separate, with process-local guards and no durable intent receipt.

## BR-AI — Artificial intelligence

### BR-AI-001 — Product roles, permissions and cost ceiling
- **Rule and authority.** The product has nine visible financial roles, six deterministic and three using LLMs on demand through a bounded gateway. CEO, Research and Strategy are the LLM-enabled roles. The gateway shares approved evidence across eligible roles, bounds context and deduplicates requests. The Product Owner sets permissions and a monthly EUR 5 product AI budget. It grants no additional spending authority. Engineering agents work exclusively in development and their costs are outside this budget.
- **Decision source.** Approved architecture §§ Agents and Approved revision, and Business Rules Foundation agent separation.
- **Invalid state and acceptance.** An unknown call cost, unknown remaining budget or exhausted budget blocks LLM calls while deterministic safety continues. Tests deny access to execution credentials and direct orders, reject malformed model output and prove concurrent reservations cannot exceed the approved budget.
- **Implementation.** Partial. The client and input normalization exist. Product orchestration, cost reservations and role-scoped gateway permissions are pending.

### BR-AI-002 — Financial reporting responsibilities
- **Rule and authority.** Leon tracks equity, positions and portfolio returns. Max records execution and fills through the authorized execution path. Clara audits evidence and reconciles records. Victor evaluates versioned strategy performance. Helena tracks losses, exposure and drawdown. The CEO Agent consolidates and communicates results. Roles consume deterministic calculations and official records under existing permissions. Agents and the frontend must never fabricate a financial result or present an unconfirmed result as confirmed.
- **Decision source.** Product Owner approval of Financial Performance Tracking before Stage 5.
- **Invalid state and acceptance.** Missing or invalid evidence propagates an unavailable or unconfirmed state to role reports and the Command Center. Each reported value traces to its source and calculation revision.
- **Implementation.** Target contract for Multi-Agent Core and authoritative reads.

## BR-LRN — Learning

### BR-LRN-001 — Independent evaluation and promotion
- **Rule and authority.** Learning produces versioned evidence and proposals. Clara independently validates historical and out-of-sample evidence, execution costs, benchmarks, drawdown and overfitting checks. The Product Owner approves strategy promotion after validation.
- **Decision source.** Approved architecture §§ Engineering boundaries and Approved revision, and Business Rules Foundation learning principle.
- **Invalid state and acceptance.** Missing, unreproducible or conflicting evidence blocks promotion. Tests require the exact strategy version, backtest evidence and independent validation before recording approval. Evaluation does not change the active strategy by itself.
- **Implementation.** Pending. The active strategy is code-defined. A proposal registry, Clara's verification flow and a promotion record are pending.

## BR-FIN — Financial sustainability

### BR-FIN-001 — Cost coverage as a KPI
- **Rule and authority.** Measure realized net results after execution costs against actual operating expenses. The Product Owner approves spending and capital changes. Cost coverage is a KPI and cannot force trades or increase risk. Paper returns remain distinct from cash that can pay invoices.
- **Decision source.** Approved architecture § Engineering boundaries and Business Rules Foundation sustainability principle.
- **Invalid state and acceptance.** Missing expense or trading-cost inputs keep cost coverage unavailable. Tests show distinct realized, unrealized, paper and expense amounts, and changing the KPI cannot change trade eligibility.
- **Implementation.** Partial. PnL aggregates exist. Net execution costs, expense accounting and cost coverage are pending.

## BR-HUM — Human approval

### BR-HUM-001 — Approval boundaries
- **Rule and authority.** Routine paper operations within an approved policy use its mandate. The Product Owner approves risk-policy changes, capital increases, out-of-policy reallocations, strategy promotions, spending increases and resumption from HALTED. The Product Owner may edit proposals manually. Material edits invalidate validation of the prior version. Approvals are authenticated, scoped, expiring, audited and revalidated against current state.
- **Decision source.** Business Rules Foundation decisions 2 and 5 and the approved architecture scope.
- **Invalid state and acceptance.** A missing, expired, stale or mismatched approval prevents the protected action. Tests distinguish routine actions from protected changes and deny reuse against changed scope or state.
- **Implementation.** Pending. Environment parameters and allocation are applied without a durable product approval workflow.

## BR-SEC — Security and audit

### BR-SEC-001 — Fail closed and preserve evidence
- **Rule and authority.** Backend enforces authorization and records decision lineage. Frontend has display authority only. The Command Center and Office View use genuine product events, with no simulated activity presented as real. The Product Owner owns access policy.
- **Decision source.** Business Rules Foundation decisions 6 and 7 and approved architecture §§ Persistence and UI.
- **Invalid state and acceptance.** Unknown authorization or invalid required data blocks the affected operation. Tests deny unauthorized reads and writes, distinguish unknown state from real signals, and trace rendered events back to the recorded decision and state revision. Secrets and raw model chain-of-thought stay out of audit records.
- **Implementation.** Partial. Logs and bounded operational summaries exist. Authorization, durable lineage and real event-driven product views are pending.

## BR-BKT — Backtesting

### BR-BKT-001 — Reproducible, risk-aware evaluation
- **Rule and authority.** Backtest and paper execution share strategy and risk logic with an injected clock and data source. Compare against buy-and-hold, equal-weight and seeded random baselines. Model fees, spread, slippage, liquidity, minimum orders and market hours. Use walk-forward evaluation and an untouched final holdout, guard against lookahead and survivorship bias, and log all trials. Clara validates evidence and the Product Owner approves promotion.
- **Decision source.** Business Rules Foundation decisions 4 and 8 and the approved architecture and backtesting gate.
- **Invalid state and acceptance.** A run with missing data or calendar, lookahead, untracked trials or irreproducible results cannot support promotion. Tests reproduce results from frozen datasets and seeds, enforce time boundaries and demonstrate the benchmark and cost calculations.
- **Implementation.** Pending. Existing indicators and risk evaluation provide building blocks. A reproducible Backtest Engine and promotion gate are pending.

## Open decisions

The Product Owner must approve the maximum exposure, maximum position size, maximum daily loss, stop-loss and take-profit, cooldown and consecutive-loss limit. The acquisition cost basis and lot-matching method, FX source and conversion rules, recovery and reconciliation of legacy history, AI budget distribution, quantitative strategy-promotion criteria and equities data provider also remain open. Existing defaults, historical thresholds and proposed budget splits are evidence for evaluation. They carry no authority as policy.
