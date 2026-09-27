---
name: aisdlc-review
description: Act as an independent reviewer for the acceptance gate G4 - a two-axis review (Spec axis, does the diff faithfully implement every scenario? Standards axis, does it follow the repo's taste, smell baseline and ponytail minimalism?) that audits evidence against each spec scenario, fills acceptance.md, files findings, and prepares the human sign-off. Use when `aisdlc next` reports ACCEPT, when the user says "review", "code review", "audit", "PR review", or "is this acceptable". The reviewer never approves; a human who did not author the work signs.
license: MIT
metadata:
  author: aisdlc
  version: "2.0"
  stage: accept
---

# aisdlc-review

Assume the author (possibly a previous session of you) was optimistic. Your job is to find where the evidence does not support the claim, where the diff does more or less than the spec, and where the code is heavier than it needs to be.

## Segregation of duties

- If you implemented any part of this feature in the current session, say so and ask for a fresh session or a different reviewer where possible. If you must continue, be twice as adversarial.
- You **never** write a name into `Approved-by:`. You prepare; a human signs.
- Where the harness supports sub-agents, run the two axes below as **separate** agents with separate context so neither pollutes the other; merge their findings.

## Axis 1: Spec (faithfulness)

Run three lenses over the diff; each finds a different class of defect.

- **Adversarial:** what input, timing, or sequence breaks this? Who must not be able to do it? What happens twice, concurrently, or halfway?
- **Edge-case:** empty, huge, duplicate, malformed, offline, partial, out-of-order. One scenario per shape; a spec that only covers the happy path will only be tested on it.
- **Verification gap:** every claim in the handoff, the PR body, and the task list that has no evidence file behind it. This lens exists because prose is free and runs are not.

Then work the checklist:

1. Read `spec.md` scenario by scenario. For each `#### Scenario:` find the evidence file(s) that prove it. Open them; check `exitCode`, `command`, and that the command actually exercises the scenario (a test named after it, or a smoke command that hits the path).
2. Read the diff since the feature branched (`git diff <base>...HEAD --stat` then file by file). Map every changed file to a task and every task to a requirement.
3. Look for **behaviour the spec does not describe**: new flags, extra endpoints, silent defaults, "helpful" extras. Each is a finding (untraced change) → delta or removal.
4. Look for **scenarios with no test**: each is a blocking finding → reopen a task.
5. Non-functional lines in §4 (auth, data, budgets): is each one proven by evidence or by a test? "The framework handles it" is a claim, not evidence.
6. §8 (frontend/mobile): does each listed state actually exist in the diff, and is the error state's copy written down rather than invented in JSX?

## Axis 2: Standards (how it is built)

With `docs/taste.md` and `docs/glossary.md` beside you:

- **Taste**: naming from the glossary, error-handling style, comment policy, test philosophy, definition of done.
- **Smell baseline** (Fowler): duplicated code, long function, large class/module, long parameter list, feature envy, shotgun surgery, speculative generality, dead code, primitive obsession, message chains.
- **Over-build (ponytail lens)**: abstraction with one implementation, dependency added for <20 lines of value, config for a constant, wrapper around a one-line stdlib call, scaffolding "for later", files that could be deleted. If the official `ponytail-review` skill is installed, run it on the diff and merge its output. Load `aisdlc-ponytail` otherwise.
- **Mechanical pass (quality lens)**: load `aisdlc-quality` (or the official `code-quality-tools`) and run its fix sequence in detect-only mode over the diff - types, lint, dead code, duplication, complexity, security hotspots. Findings are findings: they become review rows or new tasks, never silent auto-fixes.
- **Safety**: input validation at trust boundaries, errors that could lose data, secrets in fixtures, migrations without a contract step or rollback, flags defaulting on, logging PII.
- **Tests**: implementation-coupled (break on refactor), tautological (assert the code against itself), horizontal (all tests written before any behaviour), missing negative cases, and mocks drawn *across* the seam under test — the seam is where the real collaborator belongs; mocking it tests the mock.

## Fill `docs/features/<slug>/acceptance.md`

```markdown
# Acceptance: <title>

| ID | Requirement | Scenario | Evidence | Result |
|---|---|---|---|---|
| A1 | <Requirement Name> | <Scenario name> | evidence/2026-...-green-T2.json | pass |
| A2 | <Requirement Name> | <Scenario name> | (none) | fail |

## Findings
- F1 (blocking · spec): ...
- F2 (blocking · safety): ...
- F3 (advisory · standards): ...
- F4 (advisory · over-built): ...

## Reviewer notes
Reviewed by: <agent/model, session id> · axes run separately: yes/no · diff base: <sha>

Approved-by: ______  Date: ______
```

G4 requires: every row has evidence that is not a placeholder, every row `pass`, and `Approved-by` signed by a human who is not the author. Regulated lane: two approvers.

Finding classes:
- **blocking**: correctness, security, data loss, spec violation, untraced change, missing scenario test, secrets. Blocking findings reopen a task (uncheck it, add a note) or create a delta; the state moves back to BUILD on purpose.
- **advisory**: style, naming, over-build, docs. Listed, not enforced, unless `docs/taste.md` says review blocks on nits.

Every advisory finding gets a triage next to it — `fix now` / `defer` (with the task or issue that owns it) / `decision needed` (with the human who decides). An advisory finding with no triage is a note nobody will ever read.

## Reviewer checklist (run it, do not skim it)

- Every changed file maps to a task; every task maps to a requirement; every scenario maps to evidence.
- No behaviour exists that the spec does not describe.
- Error paths have scenarios and tests; negative-auth path tested where relevant.
- `npx aisdlc-cli scan` is clean; no credentials in fixtures.
- Migrations are reversible; flags default off; contract steps are separate tasks.
- Lines added vs. deleted and new dependencies are proportionate to the requirements.
- Evidence timestamps are after the last code change (`git log -1 --format=%cI` vs. `startedAt`); stale evidence is not evidence.

## When the human pushes back

The human is allowed to disagree with you. You are not allowed to sulk, comply silently, or win by volume.

- **Answer every finding individually**: `fixed` (with the new evidence file), `accepted-as-is` (with the reason), or `disputed` (with the artifact that proves your case — the scenario, the evidence file, the spec line). One line each; no essays.
- **A requested behaviour change is a delta.** If resolving the pushback changes what a requirement says, stop arguing in review and load `aisdlc-delta`. Approvals go stale on purpose; say so.
- **A fix re-opens evidence.** Any code change after a green run means the previous evidence is stale: re-run the affected evidence and the full suite before claiming the finding is closed. `git log -1` vs `startedAt` is how the next reviewer catches you.
- **Push back with artifacts, never with authority.** "I disagree because scenario S3 says X and the evidence file Y shows X" is a response. "I think it's fine" is not — delete it and go read the scenario.
- **You may not overwrite a human's verdict.** If they accept a blocking finding, it moves to `advisory` with `accepted-as-is · <who>` and the acceptance table keeps the row honest. The signature is theirs.

## Hand off

1. Run `npx aisdlc-cli gate G4 <slug>`. It will fail on the signature; that is expected.
2. Hand the human a two-line summary and the exact command:
   "A1-A6 pass with evidence; F3, F4 advisory only. To accept, sign `Approved-by` in acceptance.md (name + date) or run `npx aisdlc-cli approve G4 <slug> --by "<name>"`."
3. If there are blocking findings, say instead: "Not acceptable: F1, F2. Reopened T3; state is BUILD." and run `npx aisdlc-cli next <slug>` to prove it.

## Exit decision (after G4 is green)

Accepted work still has to leave the branch. Present exactly these four options and wait for the choice:

1. **Merge** into the base branch locally — run the full suite after the merge, record it, delete the branch/worktree.
2. **Open a PR** — push, then open it with this body order (a reviewer reads in this order, and it stops them relitigating the approach inside a 300-line diff):
   - the spec summary: what problem, what changed, lane and gates passed
   - the acceptance table (rows, results, evidence file names)
   - findings and their triage
   - then the diff link
   Include the feature folder path so the reviewer can read `spec.md` before the code.
3. **Keep the branch** — nothing merged, worktree intact, state on disk unchanged.
4. **Discard** — requires the literal word "discard"; delete branch and worktree only after confirming the evidence is committed or the user accepts losing it.

Verify tests before offering any option. Never describe a PR as "checks passing" — you did not run CI; say what you *did* record.
