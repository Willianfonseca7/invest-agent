# Engineering workflow

[AGENTS.md](../AGENTS.md) governs all stages. The Product Owner has final authority over scope, risk acceptance and merges. ChatGPT is the Tech Lead. Codex is the primary Fullstack Developer and coordinator. Frontend and Backend are optional implementation specialists. QA provides independent validation proportionate to risk. These engineering roles operate outside the product's financial agents and AI budget.

## Responsibilities and permissions

| Role | Allowed actions and responsibilities | Restrictions |
|---|---|---|
| Product Owner | Approve strategic decisions, protected operations and merges on the verified revision. | Approval must match the action and scope. |
| ChatGPT · Tech Lead | Prepare architecture, acceptance criteria and risk decisions for the Product Owner. Resolve blockers and scope ambiguity. | Planning advice grants no operational access or approval. |
| Codex · Fullstack Developer and coordinator | Implement authorized changes across the stack, run affected checks, coordinate non-overlapping assignments and record evidence. Commit, push or open a PR when authorized and pre-PR verification is complete. | Cannot independently approve its own implementation, merge without explicit owner authorization, deploy or broaden access unilaterally. |
| Frontend · specialist | Implement and test assigned UI, accessibility, i18n and client contracts. Use isolated browser verification when authorized. | No independent backend or shared-contract changes, database access, approval, delegation or release actions. |
| Backend · specialist | Implement and test assigned APIs, domain, Worker, persistence and security with isolated fixtures. | No independent frontend or shared-contract changes, production data access, approval, delegation or release actions. |
| QA · independent validator | Review the exact candidate, run authorized checks and report findings and verdict. Edit only explicitly authorized test files when required. | No production implementation edits, recursive delegation or release actions. If QA adds tests, verify the resulting snapshot before issuing a verdict. |

Use least privilege. Sandbox, approval mode, writable paths and connector scopes are enforced by their respective runtimes. The TOML instructions define behavioral boundaries. They do not grant permissions or enforce test-only writes. Prefer read-only QA when no test edits are needed. When tests need writes, use an isolated candidate and disposable outputs. No agent may modify its own rules, grant itself access or request expansion outside the approved scope. Codex alone coordinates assignment and handoffs. No recursive delegation or overlapping write assignments.

## Delivery path

Tech Lead and Product Owner define the task → Codex implements directly by default → independent QA when required → authorized PR publication → required CI → Product Owner decision → authorized merge.

Delegate only when a specialist has a concrete advantage, such as domain expertise or access to a relevant verification tool. Record the expected benefit and assign a distinct scope, criteria and output. Codex retains responsibility for integration. Use only the files, approved tools and [project-scoped skills](engineering-skills.md) needed for the assignment.

Complete affected local checks and the applicable QA gate before publishing the PR. Verify required remote CI and obtain Product Owner approval before merging. Plan the task with a base SHA, criteria, risk and affected checks. Keep a single handoff containing candidate revision, changed paths, relevant decisions, actual commands and results, unrun checks and blockers. Link existing evidence instead of repeating analysis. Avoid invoking an agent again unless a changed candidate or new evidence warrants it.

## Risk-based testing and test impact analysis

1. Map changed files to consumers, contracts, tests and mandatory checks. Include indirect impact on safety, persistence, permissions or shared types. When impact cannot be bounded, broaden verification.
2. During implementation run the affected tests and relevant lint, typecheck or build. Cover failure, recovery and boundaries in proportion to risk. Keep required safety checks in force.
3. Reuse evidence only when the tested behavior, dependencies, inputs, environment and verification criteria remain valid. Record the evidence source and what changed. A changed candidate invalidates its approvals even if some test evidence remains reusable. Required CI and approvals must match the final candidate.
4. Independent QA is mandatory for critical financial or security changes, when the task explicitly requires it, or when the governing workflow requires it. For other work, record the risk assessment and why independent QA is or is not needed. When required QA is unavailable, mark the task BLOCKED.
5. Identify redundant checks by test coverage and failure signals, not command count alone. Propose consolidation separately. Preserve mandatory safety checks and never weaken assertions or coverage to pass.

QA checks scope, correctness, business rules, security, financial integrity, architecture, contracts, test quality and regressions. Include accessibility and performance where relevant. Report severity, file and line, evidence, impact and required verification for each finding.

| Severity | Gate |
|---|---|
| P0 · Critical | Block severe security, financial risk, data loss, secret exposure or real execution. |
| P1 · High | Require fixes for significant bugs, regressions, concurrency errors or material architecture violations. |
| P2 · Medium | Require fixes for demonstrated defects, inadequate tests or material maintainability problems. |
| P3 · Low | Optional refinement. |

## Evidence and correction limits

| State | Transition |
|---|---|
| PLANNED → IN_PROGRESS | Scope, risk and acceptance criteria are recorded. |
| IN_PROGRESS → READY_FOR_QA → QA_IN_PROGRESS | Required independent QA receives the candidate and its evidence. |
| QA_IN_PROGRESS → QA_PASSED or QA_FAILED | QA reports a verdict for the exact revision. |
| QA_PASSED or recorded QA_NOT_REQUIRED → CI_VALIDATED | All required checks pass on that revision. Early CI success can be recorded here once the QA gate is satisfied. |
| CI_VALIDATED → AWAITING_OWNER → MERGED | Codex presents evidence. Merge requires explicit Product Owner authorization and verification of the final SHA and required checks. |
| Any active state → BLOCKED | Required evidence, permission or validation is unavailable, or blocking defects remain after the correction limit. Escalate to Tech Lead and await a recorded decision before resuming. |

QA or CI failures return to the responsible implementer with evidence. A changed candidate returns through its applicable QA gate and required CI. A transient CI rerun on the same revision can reuse valid QA evidence. Count each returned correction across QA and CI toward the shared limit of **three**. If a blocking finding persists after the third corrected candidate, stop with BLOCKED. Changes to candidate content invalidate earlier QA, CI and owner approval, even if HEAD stays the same.

## Runtime safety

Existing ignored `dist/` bundles may predate the live-order block. Keep them out of execution. Before an authorized start or deployment, rebuild from verified source and verify the actual artifact and running revision. This workflow grants no startup or deployment authorization.
