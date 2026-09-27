---
name: aisdlc-implement
description: Implement one task at a time, test-first at the agreed seam, with the ponytail ladder applied, recorded evidence, and zero scope creep. Use when `aisdlc next` reports BUILD, when the user says "implement", "build T3", "write the code", "continue", or "tdd". Never edits the spec silently; intent changes go through aisdlc-delta. Never claims tests pass without an evidence record. Routes fix tasks to aisdlc-debug, and defines how work is delegated to subagents and run in waves.
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
2. **Isolated workspace.** Start the feature on its own branch — `git switch -c feat/<slug>`, or a worktree when the harness supports it (`git worktree add ../<slug> -b feat/<slug>`). One feature, one branch, and never the tree where something else was half-finished; the diff a reviewer reads must contain only this feature.
3. **First task of the feature only — prove the baseline and record where you started.** Run the full suite on the current tree and record the commit with it: `npx aisdlc-cli evidence <slug> --label baseline -- git rev-parse --short HEAD && <full test command>`. The evidence file then names the exact commit the tree was green on — every later failure has something to diff against. Green baseline: proceed. Red baseline: **stop and report it as a pre-existing defect** — it is not your regression and it is not yours to fix inside this task. Ask whether to file it as its own `quick` feature first. Building on a red baseline makes every later failure ambiguous.
4. Read `docs/taste.md` (laziness level, style, DoD), `docs/glossary.md`, and the requirement(s) referenced by the task. **Quote the SHALL line and the scenario you are implementing.**
5. Identify the seam from the task's `{seam:}` or the plan. The test attaches there and only there.
6. **Trace the flow end to end** through the code the change touches (callers, callees, tests, migrations). Understanding is never lazy.
7. If the task, as written, needs behaviour the spec does not describe: **stop**, load `aisdlc-delta`. Do not invent requirements.
8. Task title starts with `fix:`? Load `aisdlc-debug` for the loop; come back here for the check-off.

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

## Parallel execution: waves, subagents, checkpoints

`aisdlc-tasks` published the wave plan from the `after:` edges. Use it.

- **One task per agent or worktree.** Tasks that share a seam, file, or migration are sequential regardless of what the edges say.
- **Delegation is context construction, not session inheritance.** When the harness supports subagents, dispatch one per task and hand it *only* what is on disk:
  - the task line verbatim, with its `{seam:}` and `{after:}`
  - the requirement's SHALL line and every `#### Scenario:` under it
  - the plan rows it touches: Decisions (with ladder rung), Data model, Interface contracts, Seams
  - the relevant `docs/taste.md` lines and `docs/glossary.md` terms
  - the exact evidence command and what counts as green
  
  Never pass your session history. A subagent that inherits the conversation inherits your guesses.
- **Two-stage review before the box is ticked.** Order is not negotiable:
  1. **Spec compliance first** — does the diff deliver every scenario of the task, and nothing the spec does not describe? (This is `aisdlc-review` Axis 1 at task scale.)
  2. **Code quality second** — only after compliance passes: taste, smells, ponytail over-build, safety. (Axis 2.)
  
  Running quality review on code that does not yet match the spec wastes the pass and hides the real defect. Findings go back to the implementer; re-review after each fix.
- **Subagent evidence is its own evidence.** A delegate finishes when its diff is on disk *and* its `evidence/*.json` files exist. "The subagent said it's done" is not a status; if it claims a run you did not record, treat the claim as unmade.
- **Human checkpoints.** Where `docs/taste.md` sets a checkpoint cadence (default: every 3 tasks, or before any wave that touches a migration, auth, or money path), stop, print `lane · state → next action → owner`, and wait. Long autonomous runs are a taste setting, not a right.
- **Two failures and you stop.** If a task has burned two red→green cycles without a root cause, stop widening the diff: record the evidence, load `aisdlc-handoff` (or `aisdlc-debug` if it is a bug), and surface it. Grinding silently is how a one-task day becomes a rewrite.
- Before ending a session with open tasks, load `aisdlc-handoff`.
- On resume, trust `tasks.md` and `evidence/` over your memory of what was done.

## Worked example (one task, start to finish)

```
next → BUILD, nextTask "T3 [R:Export CSV] stream rows without buffering the whole set" {seam: GET /export}

baseline (first task of feature)  evidence/...-baseline.json      exit 0
quote: "WHEN /export is called with >10k rows THE SYSTEM SHALL stream ..." + Scenario: large export
red    npx aisdlc-cli evidence demo --task T3 --label red -- npm test -- export   exit 1 (asserted row cap)
ladder rung 2: the repo already has a rowIterator util → reuse it, no new dependency
craft: touched lines only — one generator, honest types, no swallowed errors
green  npx aisdlc-cli evidence demo --task T3 --label green -- npm test -- export  exit 0
refactor → re-run evidence → - [x] T3 in tasks.md → npx aisdlc-cli scan → clean
report: T3 done · SHALL quoted · files: src/export.ts, test/export.test.ts ·
        evidence: ...-red.json, ...-green.json · re-run: npm test -- export
```

## When all tasks are checked

Run `npx aisdlc-cli next <slug>`. State should be VERIFY. Hand off to `aisdlc-verify`.
