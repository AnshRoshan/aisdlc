---
name: aisdlc-review
description: Act as an independent reviewer for the acceptance gate G4 - a two-axis review (Spec axis: does the diff faithfully implement every scenario? Standards axis: does it follow the repo's taste, smell baseline and ponytail minimalism?) that audits evidence against each spec scenario, fills acceptance.md, files findings, and prepares the human sign-off. Use when `aisdlc next` reports ACCEPT, when the user says "review", "code review", "audit", "PR review", or "is this acceptable". The reviewer never approves; a human who did not author the work signs.
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

1. Read `spec.md` scenario by scenario. For each `#### Scenario:` find the evidence file(s) that prove it. Open them; check `exitCode`, `command`, and that the command actually exercises the scenario (a test named after it, or a smoke command that hits the path).
2. Read the diff since the feature branched (`git diff <base>...HEAD --stat` then file by file). Map every changed file to a task and every task to a requirement.
3. Look for **behaviour the spec does not describe**: new flags, extra endpoints, silent defaults, "helpful" extras. Each is a finding (untraced change) → delta or removal.
4. Look for **scenarios with no test**: each is a blocking finding → reopen a task.
5. Non-functional lines in §4 (auth, data, budgets): is each one proven by evidence or by a test? "The framework handles it" is a claim, not evidence.

## Axis 2: Standards (how it is built)

With `docs/taste.md` and `docs/glossary.md` beside you:

- **Taste**: naming from the glossary, error-handling style, comment policy, test philosophy, definition of done.
- **Smell baseline** (Fowler): duplicated code, long function, large class/module, long parameter list, feature envy, shotgun surgery, speculative generality, dead code, primitive obsession, message chains.
- **Over-build (ponytail lens)**: abstraction with one implementation, dependency added for <20 lines of value, config for a constant, wrapper around a one-line stdlib call, scaffolding "for later", files that could be deleted. If the official `ponytail-review` skill is installed, run it on the diff and merge its output. Load `aisdlc-ponytail` otherwise.
- **Mechanical pass (quality lens)**: load `aisdlc-quality` (or the official `code-quality-tools`) and run its fix sequence in detect-only mode over the diff - types, lint, dead code, duplication, complexity, security hotspots. Findings are findings: they become review rows or new tasks, never silent auto-fixes.
- **Safety**: input validation at trust boundaries, errors that could lose data, secrets in fixtures, migrations without a contract step or rollback, flags defaulting on, logging PII.
- **Tests**: implementation-coupled (break on refactor), tautological (assert the code against itself), horizontal (all tests written before any behaviour), missing negative cases.

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

## Reviewer checklist (run it, do not skim it)

- Every changed file maps to a task; every task maps to a requirement; every scenario maps to evidence.
- No behaviour exists that the spec does not describe.
- Error paths have scenarios and tests; negative-auth path tested where relevant.
- `npx aisdlc-cli scan` is clean; no credentials in fixtures.
- Migrations are reversible; flags default off; contract steps are separate tasks.
- Lines added vs. deleted and new dependencies are proportionate to the requirements.
- Evidence timestamps are after the last code change (`git log -1 --format=%cI` vs. `startedAt`); stale evidence is not evidence.

## Hand off

1. Run `npx aisdlc-cli gate G4 <slug>`. It will fail on the signature; that is expected.
2. Hand the human a two-line summary and the exact command:
   "A1-A6 pass with evidence; F3, F4 advisory only. To accept, sign `Approved-by` in acceptance.md (name + date) or run `npx aisdlc-cli approve G4 <slug> --by "<name>"`."
3. If there are blocking findings, say instead: "Not acceptable: F1, F2. Reopened T3; state is BUILD." and run `npx aisdlc-cli next <slug>` to prove it.
