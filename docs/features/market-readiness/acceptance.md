# Acceptance: Market readiness

No scenario is accepted yet. A row may show `pass` only after a reviewer who did not write the code signs G4; the Evidence column names runs the CLI recorded, and this file is never filled from plans or memory.

| ID | Requirement | Scenario | Evidence | Result |
|---|---|---|---|---|
| A1 | Publish a release | Publish succeeds | none yet (needs a tag push) | pending |
| A2 | Publish a release | Credentials are missing | none yet | pending |
| A3 | Publish a release | Tests fail | none yet | pending |
| A4 | Deploy the site | Deploy succeeds on HEAD | evidence/2026-10-21T07-07-29-988Z-deploy-f74b0652-2f97-4c36-887f-d6f4fe98fdb3.json | pending |
| A5 | Deploy the site | Build fails | none yet | pending |
| A6 | Bind approvals to the tree | Tree unchanged | evidence/2026-10-21T07-11-39-811Z-full-6b643990-bb3c-456c-9d12-827431b54240.json | pending |
| A7 | Bind approvals to the tree | Code changed after approval | evidence/2026-10-21T07-11-39-811Z-full-6b643990-bb3c-456c-9d12-827431b54240.json | pending |
| A8 | Bind approvals to the tree | Evidence added after approval | evidence/2026-10-21T07-11-39-811Z-full-6b643990-bb3c-456c-9d12-827431b54240.json | pending |
| A9 | Bind approvals to the tree | No git repository | evidence/2026-10-21T07-11-39-811Z-full-6b643990-bb3c-456c-9d12-827431b54240.json | pending |
| A10 | Report enforcement honestly | Claude Code with the guard | evidence/2026-10-21T07-11-39-811Z-full-6b643990-bb3c-456c-9d12-827431b54240.json | pending |
| A11 | Report enforcement honestly | A harness without a native guard | evidence/2026-10-21T07-11-39-811Z-full-6b643990-bb3c-456c-9d12-827431b54240.json | pending |
| A12 | Gate a pull request in CI | Gates pass | evidence/2026-10-21T07-11-39-811Z-full-6b643990-bb3c-456c-9d12-827431b54240.json | pending |
| A13 | Gate a pull request in CI | Gates fail | evidence/2026-10-21T07-11-39-811Z-full-6b643990-bb3c-456c-9d12-827431b54240.json | pending |
| A14 | Export portable evidence | Export succeeds | evidence/2026-10-21T07-11-39-811Z-full-6b643990-bb3c-456c-9d12-827431b54240.json | pending |
| A15 | Export portable evidence | Export is tampered with | evidence/2026-10-21T07-11-39-811Z-full-6b643990-bb3c-456c-9d12-827431b54240.json | pending |
| A16 | Export portable evidence | Export is unsigned | evidence/2026-10-21T07-11-39-811Z-full-6b643990-bb3c-456c-9d12-827431b54240.json | pending |
| A17 | Expose read-only state over MCP | List tools | evidence/2026-10-21T07-11-39-811Z-full-6b643990-bb3c-456c-9d12-827431b54240.json | pending |
| A18 | Expose read-only state over MCP | State request | evidence/2026-10-21T07-11-39-811Z-full-6b643990-bb3c-456c-9d12-827431b54240.json | pending |
| A19 | Expose read-only state over MCP | Write attempt | evidence/2026-10-21T07-11-39-811Z-full-6b643990-bb3c-456c-9d12-827431b54240.json | pending |
| A20 | Support current harness names | Antigravity install | evidence/2026-10-21T07-11-39-811Z-full-6b643990-bb3c-456c-9d12-827431b54240.json | pending |
| A21 | Support current harness names | Retired name | none yet (the notice is not asserted by a test) | pending |
| A22 | Package for every marketplace | Skills CLI install | none yet (T13 not shipped) | pending |
| A23 | Package for every marketplace | Plugin validation | evidence/2026-10-21T06-53-14-894Z-smoke-96d8689d-9dab-4146-a7b4-948b86a850ea.json | pending |
| A24 | Keep public claims checkable | Claim audit | none yet | pending |
| A25 | Publish evals | Seeded fake green is caught | none yet (T20 not started) | pending |
| A14 | Export portable evidence | Export succeeds | pending | pending |
| A15 | Export portable evidence | Export is tampered with | pending | pending |
| A16 | Export portable evidence | Export is unsigned | pending | pending |
## Findings

- F1 (advisory · spec): the spec is unsigned and no gate has been evaluated. This is a proposal, not an accepted feature. Triage: fix now, at G1.
- F2 (advisory · safety): tree binding is implemented for G1, G4 and G5 only, and only for approvals that carry `head`. A prose `Approved-by` with no recorded approval is still invisible to drift. Triage: decision needed -> maintainer, whether the acceptance signature must always produce an approval record.
- F3 (advisory · standards): the repository had no agent-facing context and no glossary. Triage: fixed on 2026-10-20; verify at review.
- F4 (blocking · spec): phase 1 and phase 3 code (T5-T10, T12, T14-T19) landed before G1 was signed. Recorded as F-04 in `context/decisions.md`. Triage: decision needed -> maintainer, sign the plan or send the work back.
- F5 (advisory · spec): two scenarios have no test behind them - A21 (the retirement notice is printed but not asserted) and A22 (T13 is unshipped). A1-A5 need a push and npm credentials, so they cannot be evidenced locally. Triage: defer -> T13, T1-T5 verification.
- F6 (advisory · standards): export, verify, signer adapter, MCP and tree binding were implemented before their tests were written, which breaks the repo's own RED-GREEN rule. Tests followed in the same session (87/87) and are genuine, but the order is on the record. Triage: decision needed -> maintainer, whether to treat this as a delta to the workflow or a one-off.

Evidence cited above is the recorded `node --test` run (87/87) and the `claude plugin validate` smoke run at the time of writing; the rows stay `pending` because the reviewer who signs G4 has not run yet, and the author does not grade their own work.

## Reviewer notes

Reviewed by: pending · axes run separately: no · diff base: none
- Security review: pending. The export and publish paths handle credentials and must be reviewed before release.
- Security readiness: NOT_VERIFIED until applicable controls have evidence; keep its control table separate.
Author model: pending · Reviewer model: pending · Cross-model: pending

_Do not fill the line below unless you are the human approver. Agents must leave it blank._

Approved-by: ______  Date: ______
