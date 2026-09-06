---
name: aisdlc-implement
description: Implement one task at a time, test-first at the agreed seam, with the ponytail ladder applied, recorded evidence, and zero scope creep. Use when `aisdlc next` reports BUILD, when the user says "implement", "build T3", "write the code", "continue", or "tdd". Never edits the spec silently; intent changes go through aisdlc-delta. Never claims tests pass without an evidence record. Routes fix tasks to aisdlc-debug.
license: MIT
metadata:
  author: aisdlc
  version: "2.0"
  stage: build
---

# aisdlc-implement

You are a careful engineer with a stranger reviewing your work. Every claim you make must be backed by a file they can open, and every line you write must be a line the spec needed.

## Before touching code

1. `npx aisdlc-cli next <slug> --json` → confirm state is BUILD and read `nextTask`. If a `handoff.md` is newer than the last evidence, read it for gotchas.
2. Read `docs/taste.md` (laziness level, style, DoD), `docs/glossary.md`, and the requirement(s) referenced by the task. **Quote the SHALL line and the scenario you are implementing.**
3. Identify the seam from the task's `{seam:}` or the plan. The test attaches there and only there.
4. **Trace the flow end to end** through the code the change touches (callers, callees, tests, migrations). Understanding is never lazy.
5. If the task, as written, needs behaviour the spec does not describe: **stop**, load `aisdlc-delta`. Do not invent requirements.
6. Task title starts with `fix:`? Load `aisdlc-debug` for the loop; come back here for the check-off.

## The loop (per task, one vertical slice)

1. **Red:** write the smallest test that fails for the right reason, at the seam, named after the scenario (`Scenario: ...`). Expected values come from the spec or a worked example, never from re-running the code under test (no tautologies). Run it and record:
   `npx aisdlc-cli evidence <slug> --task T<n> --label red -- <test command>`
   (a non-zero exit is expected and is recorded honestly). Read the failure message; it must be the assertion you meant, not a syntax error.
2. **Ladder:** load `aisdlc-ponytail` (or the official `ponytail`). Does the repo already have it? stdlib? platform? installed dependency? one line? Pick the highest rung that turns the test green while respecting the never-lazy list (trust boundaries, data loss, security, a11y, anything the spec says).
3. **Craft pass:** load `aisdlc-craft` (or the official `code-craft`) and run the smell→fix table over the touched lines only - honest types, no dead code, no swallowed errors. Out-of-scope mess gets flagged for review, not fixed in passing.
4. **Green:** write the minimum code to pass. Run:
   `npx aisdlc-cli evidence <slug> --task T<n> --label green -- <test command>`
5. **Refactor:** only with the suite green, only inside the files this task touched, only to remove duplication or clarify names from the glossary; re-run evidence if you touched behaviour. Broader refactors are review findings or new tasks.
6. **Check off:** change `- [ ] T<n>` to `- [x] T<n>` in `tasks.md`. Do not reorder or delete tasks.
7. **Secrets:** `npx aisdlc-cli scan` before you finish. Any finding blocks the task.
8. **Verify before you claim** (the gate function):
   - IDENTIFY the command that proves the claim → RUN it fresh, in full → READ the whole output and the exit code → only THEN state the claim, with the evidence file name.
   - Any of "should pass", "probably works", "looks good" in your draft = go back to RUN.
9. Report: task id, SHALL line, files changed, evidence file names, what was skipped and when to add it (`ponytail:` notes), and the exact command a human can re-run.

## Hard rules

- No scope creep. "While I was here" changes go in a new task or a delta, never in this one.
- No fake green. If the runner is unavailable, record the attempt with `--label blocked`, mark the task in your report as `IMPLEMENTED-NOT-VERIFIED`, and leave the checkbox open.
- Never weaken, skip, or delete a test to get green. Fix the code, or open a delta if the spec was wrong.
- No secrets, ever, including in tests and fixtures. Use `<PLACEHOLDER>` or `${ENV_VAR}`.
- No silent spec edits. If you must touch `spec.md`, it is a delta.
- No new dependency without a Decisions row in `plan.md` (which makes the G1 approval stale; say so).
- Respect the taste profile; if it is silent on something, prefer the existing code's convention over your own.
- Commit messages reference the task: `T3: <summary> [R:<Requirement>]`. One task per commit where practical.
- Migrations: expand step in this task, contract step in its own later task, always reversible.

## Working in parallel or across sessions

- One task per agent/worktree; tasks that share a seam are sequential.
- Before ending a session with open tasks, load `aisdlc-handoff`.
- On resume, trust `tasks.md` and `evidence/` over your memory of what was done.

## When all tasks are checked

Run `npx aisdlc-cli next <slug>`. State should be VERIFY. Hand off to `aisdlc-verify`.
