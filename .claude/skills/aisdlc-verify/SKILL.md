---
name: aisdlc-verify
description: Run the merge-safety gate G3 honestly - full test run recorded as evidence, secrets scan, and kind-specific verification (visual diff, a11y, integration smoke, dry-run, evals). Use when `aisdlc next` reports VERIFY, when the user says "verify", "is it done", "run the gates", "does it work", or before opening a PR or claiming completion. Enforces the iron law: no completion claim without fresh verification evidence. Distinguishes PASS from IMPLEMENTED-NOT-VERIFIED and never fakes green.
license: MIT
metadata:
  author: aisdlc
  version: "2.0"
  stage: verify
---

# aisdlc-verify

Verification is the moment the process either earns trust or destroys it. The output of this skill is evidence files, not sentences.

## Iron law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you have not run the command in this session and recorded it, you cannot say it passes. Violating the letter of this rule is violating the spirit of it.

## The gate function (before any status claim, every time)

1. **IDENTIFY** the command that would prove the claim.
2. **RUN** it, fresh and complete, through `npx aisdlc evidence` so the run is recorded.
3. **READ** the entire output: exit code, failure count, skipped count, warnings that are really errors.
4. **VERIFY** the output supports the claim. If not, state the actual status with the evidence file. If yes, state the claim *with* the evidence file.
5. Only then make the claim.

| claim | requires | not sufficient |
|---|---|---|
| tests pass | full-suite run, exit 0, 0 failures, recorded | a previous run, "should pass", the subset you wrote |
| build succeeds | build command exit 0, recorded | linter passing, logs "look fine" |
| bug fixed | the red test now green + full suite green | code changed, assumed fixed |
| a11y ok | axe/pa11y report with 0 serious violations, recorded | "used semantic HTML" |
| migration safe | applied to a copy and rolled back, recorded | "it's just an add column" |
| subagent finished | diff on disk + its evidence files | the subagent said "done" |

## What G3 checks (`npx aisdlc gate G3 <slug>`)

1. **Secrets scan clean** across tracked files (8 pattern families, placeholders ignored).
2. **Test evidence present**: at least one `evidence/*.json` with `label: green` (or `full`) and a real command.
3. **Full suite recorded and green**: the latest `full` evidence has `exitCode: 0`.
4. **All tasks checked off.**

## Procedure

1. Run the **whole** suite, not just the tests you wrote:
   `npx aisdlc evidence <slug> --label full -- <full test command from plan.md Verification strategy>`
2. Run kind-specific verification and record each as evidence with a descriptive label:

   | kind | required extra evidence |
   |---|---|
   | frontend | component tests, visual diff (or screenshots), a11y audit (axe/pa11y), keyboard-only pass |
   | backend | integration tests, preview/local smoke (`curl` against a running instance), one negative-auth request |
   | mobile | emulator run, store checklist |
   | data | invariant tests, backfill parity check, row counts before/after |
   | ml | eval suite against thresholds; evals are tests; adversarial cases |
   | infra | plan/dry-run, policy check, expand/contract order, destroy plan reviewed |
   | docs | lint, link check, code samples executed |
   | lib | API contract tests, semver check, back-compat test against the previous version |

3. Static checks the repo already has (typecheck, lint, build): run and record them too; a green suite on code that does not compile is not green.
4. `npx aisdlc scan`. Findings block; fix and re-run.
5. `npx aisdlc gate G3 <slug>`. Paste the output verbatim.
6. Scenario sweep: for every `#### Scenario:` in the spec, name the evidence file that exercises it. Missing one? That is a missing test: go back to BUILD via a new task, do not proceed.
7. Write `acceptance.md` rows for each spec scenario, linking the evidence file names (see `aisdlc-review`).

## Honesty protocol

- If a command cannot run (missing runtime, network, credentials), record it anyway with `--label blocked`; the exit code and stderr are the evidence. Report `IMPLEMENTED-NOT-VERIFIED` and list exactly what a human must provide (names, never values).
- Never edit an evidence file. They are append-only and hashed.
- Never delete, skip, or loosen a failing test to get green. Fix the code, or open a delta if the spec was wrong.
- Flaky test? Record three runs. Three greens are evidence; two out of three is a bug report → `aisdlc-debug`.
- Words that mean you have not verified: "should", "probably", "seems to", "I believe", "looks good", "Done!" before the command ran. Delete them and run the command.

## Hand off

When G3 is green, run `npx aisdlc next <slug>`; the state moves to ACCEPT. Load `aisdlc-review`. Prefer a fresh session for the review (segregation of duties); if you must continue, say so.
