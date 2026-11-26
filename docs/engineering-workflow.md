# Engineering workflow

The external ChatGPT Tech Lead owns planning, architecture, technical decisions and acceptance criteria. The local Codex coordinator assigns and routes work, records evidence and controls stage transitions. Frontend and Backend implement. QA independently tests the candidate and reviews the exact diff. The Product Owner keeps final authority over strategic decisions and merges. These three engineering roles operate separately from the product's nine financial roles. [AGENTS.md](../AGENTS.md) governs all stages.

## Stage order

Tech Lead → Frontend and/or Backend → QA → CI → Product Owner → authorized merge.

The coordinator starts with the task ID, base SHA, approved scope, acceptance criteria, required checks and constraints. Invoke only relevant agents. If both implementers are needed, assign non-overlapping files or coordinate shared contracts sequentially. Keep handoffs compact and route them through the coordinating session, which starts agents, sends follow-ups and collects results. Use native coordination and record state in the task thread or PR. Keep the workflow manual if the client cannot delegate natively.

CI can run automatically earlier. The coordinator records `CI_VALIDATED` only after QA passes and required CI checks are verified for the same revision. The coordinator sends that evidence directly to the Product Owner. Only an authorized human merge can record `MERGED`.

## States and transitions

| State | Permitted next state and condition |
|---|---|
| `PLANNED` | `IN_PROGRESS` after the Tech Lead defines scope and criteria. |
| `IN_PROGRESS` | `READY_FOR_QA` when the implementer submits a candidate and evidence. |
| `READY_FOR_QA` | `QA_IN_PROGRESS` when independent QA starts verification. |
| `QA_IN_PROGRESS` | `QA_FAILED` if required criteria fail, or `QA_PASSED` with evidence for the final tested revision. |
| `QA_FAILED` | `IN_PROGRESS` for a correction within the shared limit. |
| `QA_PASSED` | `CI_VALIDATED` once required CI checks pass on the QA-approved revision. If a fix is needed, return to `IN_PROGRESS`. |
| `CI_VALIDATED` | `AWAITING_OWNER` when the coordinator submits the QA and CI evidence for that revision. |
| `AWAITING_OWNER` | `MERGED` after explicit owner approval and verification of the final SHA and checks. Return to `IN_PROGRESS` if changes are requested. |
| `MERGED` | Terminal. Further work starts a new task. |
| `BLOCKED` | Resume only with a recorded Tech Lead decision. Return to `IN_PROGRESS` for changes or repeat the blocked verification on the same snapshot. Any revised candidate starts again at QA. |

Any active stage can enter `BLOCKED` if required evidence, permission or verification is unavailable, or if a blocker remains after the correction limit. Escalate to the Tech Lead with the current revision, evidence, remaining blockers and options. Neither a blocked check nor an exhausted limit constitutes approval.

## Corrections and evidence

- **QA failure:** Record reproducible findings and route them to the responsible implementer. QA rechecks previous findings and all affected changes and forwards passing candidates directly to CI.
- **CI failure:** Route the cause to its owner. If the fix changes candidate content, return to the implementer and then QA before accepting CI again. A transient rerun on the same revision can reuse current QA evidence.
- **Limit:** At most three correction rounds per task across QA and CI. Count a round when the coordinator returns a failed candidate for correction. If blocking defects persist after the third corrected candidate, enter `BLOCKED`, report remaining findings, and await a decision from the Tech Lead.
- **Revision binding:** Record the exact base and candidate SHA or a reproducible fingerprint of the authorized diff and untracked candidate files. QA evidence includes any QA test changes. Changing candidate content invalidates prior approvals, including CI and owner approval, even if HEAD stays the same. Before merge, compare the PR head SHA, reviewed content and required check results. Use a fresh candidate if evidence cannot be mapped to the exact revision.

## Handoffs

| Reporter | Required fields |
|---|---|
| Implementer | Task ID, objective, files changed, technical decisions, tests and real results, limitations, known risks and candidate revision. |
| QA | `PASSED`, `FAILED` or `BLOCKED`, tested revision, criteria, commands, results and unrun checks. For each finding include ID, severity, file and line, evidence, impact, required fix, expected verification and correction owner. |

## QA quality gate

Inspect the diff and derive checks independently of the implementer. Check AGENTS.md compliance, business rules, acceptance criteria, scope, architecture, security, financial integrity, contracts and typing, test quality, regressions, relevant duplication and unnecessary dependencies. Include performance and accessibility when relevant. Scale the review and tests to the risk. The QA agent can consult `code-review` on demand within this gate.

| Severity | Gate |
|---|---|
| P0 — Critical | Immediate block for severe security, financial risk, data loss, secret exposure or real execution. |
| P1 — High | Required fix for significant bugs, regressions, concurrency errors or material architecture violations. |
| P2 — Medium | Fix genuine defects, material duplication, inadequate tests or maintainability issues with demonstrated impact. |
| P3 — Low | Optional refinement. Does not block by itself. |

## Permissions, skills and cost

Agents inherit the coordinating session's sandbox and approvals. Profile instructions define behavioral scope. QA may edit authorized tests only. The profiles do not technically enforce test-only writes. For a check requiring write isolation, use a separate read-only QA session and return its evidence to the coordinator. Any authorized test edits occur separately and require revalidation of the resulting snapshot. Review external connector permissions separately. Agents cannot modify their own rules or grant themselves additional permissions.

Read relevant vetted skills on demand and use existing deterministic tools for verification. The product's EUR 5 application budget is separate from development usage. Avoid unbounded retries and paid external API calls.

For future global installation, use one private versioned copy of [personal-ai-skills.](https://github.com/Willianfonseca7/personal-ai-skills.), with individually approved links in `~/.agents/skills/` and `~/.claude/skills/`. Review candidate revisions and their auxiliary files before updating links. Preserve existing entries, confirm discovery in fresh sessions and keep the prior revision for rollback. Draft skills remain available by direct reading only until the owner approves installation and their evidence is reviewed.

## Critical technical backlog

- **P0 — Stale local API/Worker bundles.** Existing ignored `dist/` bundles were found with the old exchange order path and without the current live-order block. Keep them out of execution. Before a separately approved start or deployment, rebuild from verified source and confirm the resulting artifacts and actual running revision enforce the paper-only boundary. This workflow adds no release or deployment authorization.
