---
name: aisdlc-debug
description: Disciplined, evidence-backed debugging loop for bugs, flaky tests, performance regressions and "it works on my machine". Use when the user says "bug", "broken", "fix this", "why does", "error", "crash", "regression", "flaky", "slow", pastes a stack trace, or when verification finds a failing scenario. Reproduce first, build a feedback loop that goes red on the exact symptom, minimise, hypothesise, instrument, fix the root cause (never the symptom), add a regression test, and record every run as evidence. Opens a delta when the bug reveals the spec was wrong.
license: MIT
metadata:
  author: aisdlc
  version: "2.0"
  stage: build
---

# aisdlc-debug

A bug is a scenario the spec forgot or a promise the code broke. Either way the exit is the same: a failing test that becomes a passing test, with evidence for both.

## Iron law

```
NO FIX WITHOUT A RED RUN FIRST. NO "FIXED" WITHOUT A GREEN RUN AFTER.
```

If you cannot make it fail on purpose, you do not understand it yet, and a fix you cannot verify is a guess wearing a commit message.

## Step 0: Route it into the process (1 minute)

- Existing feature owns the flow? Add a task to its `tasks.md`: `- [ ] T<n> [R:<Requirement>] fix: <symptom>` (must reference the requirement whose scenario is broken; if none exists, that is a delta, see Step 6).
- No feature owns it? `npx aisdlc-cli new "fix: <symptom>" --kind <kind> --lane quick`. The spec gets one requirement: the behaviour that should have held, with the repro as its scenario. Bugs in auth, money, PII or data integrity are `--lane regulated`.
- Read `docs/taste.md`, the requirement, and `docs/glossary.md` so the test is named in the project's language.

## Step 1: Reproduce (build the feedback loop)

1. Get the exact symptom: command, input, environment, expected vs. actual, frequency. If any of these is missing, ask for that one thing (load `aisdlc-grill` for a one-round session if the report is vague).
2. Write the smallest automated test that goes **red on this exact symptom**. Name it after the scenario: `Scenario: <what should happen>`. Prefer the highest seam that still reproduces it (HTTP, CLI, public function) over poking internals.
3. Record it: `npx aisdlc-cli evidence <slug> --task T<n> --label red -- <test command>`. A non-zero exit is the point.
4. Cannot reproduce? Record the attempt with `--label blocked`, list what you tried, and ask for the missing variable (data, version, timezone, locale, concurrency). Do not "fix" what you cannot see.

Flaky? Run it ten times in a loop and record the run. Three greens out of ten is a bug, not noise.

## Step 2: Minimise

Shrink the repro until removing anything more makes it pass: fewer inputs, fewer steps, fewer dependencies, a fixed clock, a fixed seed. Each removal that keeps it red is information. Write the minimal repro into the test.

## Step 3: Hypothesise, then instrument (do not guess-edit)

- Write down 2-3 hypotheses ranked by likelihood, each with the observation that would confirm or kill it.
- Get the observation cheaply: a log line, a debugger breakpoint, `git bisect` (record the bisect as evidence), a query, a timing. Use `git log -S<symbol>` and `git blame` to find when the behaviour changed and read that commit's intent.
- Kill hypotheses with evidence, not opinion. Never change production code to "see if it helps"; instrumentation is temporary and is removed before the fix is committed.

## Step 4: Fix the root cause

- Grep every caller of the function you are about to touch. The lazy fix is the root-cause fix: one guard where all callers route through beats one guard per caller. (Load `aisdlc-ponytail`.)
- Minimum change that turns the red test green. No drive-by refactors; note them as follow-up tasks.
- Ask: "what else has this shape?" If the same bug class exists elsewhere, list the locations; fix them only if the human agrees (scope), otherwise open tasks.

## Step 5: Prove it

1. Green run on the regression test: `npx aisdlc-cli evidence <slug> --task T<n> --label green -- <test command>`.
2. Full suite: `npx aisdlc-cli evidence <slug> --label full -- <full test command>`. A fix that breaks a sibling is not a fix.
3. `npx aisdlc-cli scan`.
4. Check the task off. Report: root cause (one sentence), why it was not caught (missing scenario / missing test / infra), files changed, evidence file names, the exact command a human can re-run.

## Step 6: When the bug reveals the spec was wrong

If the "expected" behaviour is not what any scenario describes, or two requirements contradict, stop and load `aisdlc-delta`. Write the delta, update the spec, and tell the human that approvals will go stale. Never make the test agree with the code to get green.

## Performance regressions

Same loop, different assertion. The red test asserts a budget (`p95 < 300ms`, `< 50 queries`, `< 200MB`) measured the same way every time; record the baseline run as `--label baseline` before you touch anything. Profile before you optimise; a profiler trace is evidence, a hunch is not.

## Red flags

- "It should be fixed now." → run it.
- Changing three things at once. → one hypothesis at a time.
- Deleting or skipping the failing test. → never.
- Adding a `try/catch` that swallows the error. → that is hiding, not fixing.
- A fix in the caller the ticket named while siblings are identical. → go to the shared function.
- No evidence files in your report. → you are not done.
