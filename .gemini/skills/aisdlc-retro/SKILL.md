---
name: aisdlc-retro
description: Close the loop on a finished feature, incident, or sprint so the process gets better instead of just longer. Use when `aisdlc next` reports DONE, when the user says "retro", "retrospective", "post-mortem", "lessons learned", "what went wrong", or after a rollback. Compares what the spec promised with what shipped, which gate caught what, where time went, what the agent over-built, and turns each lesson into a concrete change to docs/constitution.md, docs/taste.md, docs/glossary.md, or a skill. Blameless, evidence-based, short.
license: MIT
metadata:
  author: aisdlc
  version: "2.0"
  stage: release
---

# aisdlc-retro

A retro that ends in feelings changes nothing. This one ends in diffs to the files every future session reads.

## Inputs (read, do not ask)

- `spec.md`, `plan.md`, `tasks.md`, `acceptance.md`, `deltas/*.md`, `evidence/*.json`, `approvals.json`, `handoff.md` if present.
- `git log --stat` for the feature's commits; count files touched, lines added vs. deleted, dependencies added (`package.json`, lockfiles, `requirements*.txt`, `go.mod`...).
- `npx aisdlc audit <slug>` for the approval chain and stale approvals.
- For incidents: the runbook, alerts, and the timeline the human gives you.

## Procedure (20 minutes, one pass)

1. **Timeline from evidence.** Order evidence files and approvals by timestamp. Note gaps longer than a day and the number of red → green cycles per task. This is where the time went.
2. **Spec vs. shipped.** For each requirement: unchanged / changed by delta / silently drifted (behaviour exists that no scenario describes → that is a finding, not a footnote).
3. **Gate scorecard.** For each gate: what it caught (a real defect, a missing artifact, nothing) and how many attempts it took. A gate that never fails in ten features is either perfect or theatre; say which you believe and why.
4. **Over-build audit (ponytail lens).** Abstractions with one caller, dependencies added for <20 lines of value, files that could be deleted today, comments marked `ponytail:` that never got the promised upgrade or removal. If the official `ponytail-debt` skill is installed, run it.
5. **Ask the human two questions** (load `aisdlc-grill`, one round): "What surprised you?" and "What would you refuse to do the same way again?" Give your own answers first.
6. **Write `docs/features/<slug>/retro.md`** and open the proposed changes.

## File contract: `retro.md`

```markdown
# Retro: <title>
Lane: <lane> · duration: <first evidence → last approval> · tasks: <n> · deltas: <n> · red→green cycles: <n>

## What the spec got wrong
- <requirement>: <what changed and which delta / or what drifted without one>

## What each gate caught
| gate | attempts | caught |
|---|---|---|
| G1 | 2 | plan hash stale after decision change |

## Where time went
- <task or wait>: <duration> because <reason>

## Over-built / under-built
- +<lines> / −<lines>, <n> new dependencies. <specific candidates for deletion or upgrade>

## Keep / change / stop
- Keep: ...
- Change: ...
- Stop: ...

## Proposed changes (each becomes a diff or a task)
| # | file | change | why |
|---|---|---|---|
| 1 | docs/constitution.md | add "migrations ship with a rollback test" | G5 caught an irreversible migration |
| 2 | docs/taste.md | laziness: ultra for scripts/ | 3 tasks over-built helpers |
| 3 | docs/glossary.md | add "materialise" | term caused two clarification rounds |
| 4 | skills/<name>/SKILL.md (if this repo owns skills) | ... | ... |
```

## Turning lessons into changes

- **Constitution** gets rules that were violated or missing and that a future session must not rediscover. One line each. Number them.
- **Taste** gets calibration: verbosity, laziness level, review strictness, definition-of-done items that were repeatedly forgotten.
- **Glossary** gets every term that caused a clarification round.
- **Skills** (only if this repository owns its skills) get the concrete step that would have prevented the miss. Keep skill edits surgical; they are read by every session.
- Anything requiring code is a new feature or delta, not a retro side effect.

Apply the doc changes in the same turn when the human says yes; list them as files changed. Never edit approvals, evidence, or signed sections.

## Incident variant (post-mortem)

Same file, plus at the top: impact (who, how long, how much), detection (alert or human?), time to mitigate, time to root cause, and the runbook row that was missing or wrong. Every "action item" is a task in a feature with an owner and a date, or it does not exist.

## Rules

- Blameless. Systems and artifacts, not people.
- Evidence over memory: cite file names and timestamps.
- Ten lines of proposed changes beat ten pages of narrative.
- If nothing needs to change, write that; a clean retro is data too.
