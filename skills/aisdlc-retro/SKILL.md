---
name: aisdlc-retro
description: Close the loop on a finished feature, incident or sprint so the process gets better instead of just longer. Use when `aisdlc next` reports DONE, the user says "retro", "retrospective", "post-mortem", "lessons learned", "what went wrong", or after a rollback. Compares what the spec promised with what shipped, which gate caught what, where time went, what the agent over-built, and turns each lesson into a concrete edit to the constitution, taste, glossary or a skill.
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
- `npx aisdlc-cli audit <slug>` for the approval chain and stale approvals.
- `npx aisdlc-cli report <slug>` (and `report` with no argument, for every feature at once) for the numbers: run count and pass rate, time on disk, whether the last full run predates the last code change, approvals that went stale, how the review scored, and the slowest gate-to-gap. Compute these; do not eyeball a directory listing.
- For incidents: the runbook, alerts, and the timeline the human gives you.

## Procedure (20 minutes, one pass)

1. **Timeline from evidence.** Start from `report`'s numbers, then read the files behind them. Order evidence and approvals by timestamp; note gaps longer than a day and the red → green cycles per task. A red run followed by a green one on the same task is debugging; six is a seam in the wrong place. This is where the time went, and it should be boring arithmetic before it is a story.
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

### Amending the constitution (do this every time, not sometimes)

`docs/constitution.md` is a governed document, not a scratchpad. When a retro (or anything else) changes it:

1. **Bump the header.** Immediately under the title sit two lines: `Version: X.Y` and `Amended: YYYY-MM-DD`. `aisdlc init` / `aisdlc new` seed them at `Version: 1.0` with today's date, so every amendment after that bumps them: **MINOR** for a new principle, **MAJOR** for a principle removed, redefined or made stricter in a way that invalidates existing artifacts, **PATCH** for wording. A constitution whose header says `1.0` but has been edited since has lost its audit trail — bump it first, then edit.
2. **One numbered line per principle**, plus a one-line rationale that names the incident that caused it ("G5 caught an irreversible migration" — not "be careful with migrations").
3. **Record the amendment** in `retro.md`'s Proposed changes table: file, change, why. The table *is* the amendment record.
4. **Say what it invalidates.** A stricter principle can make an approved plan non-compliant. Check the open features' `## Constitution check` rows against the new text and flag the ones that now need re-justification — a principle that nothing re-reads is decoration.
5. Never edit a numbered non-negotiable to make a failure disappear. If one of them was wrong, that is an `MAJOR` bump and a conversation, not a quiet rewrite.

### Editing a skill (only in a repo that owns its skills)

- Change the **smallest** section that would have prevented the miss. A skill is read in full by every session; a paragraph added casually is a paragraph forever.
- If the miss is about *discovery* rather than *execution*, the fix belongs in the `description` frontmatter (what the user says / when it triggers), not the body — the body does not exist until the skill has already been chosen.
- Keep the body under ~500 lines; if an edit pushes toward it, move the detail into a file the skill points at, with a clear "read this when".
- In this repository: edit `skills/<name>/SKILL.md`, then run `node packages/cli/scripts/sync-skills.mjs` so `packages/cli/skills/` matches. A skill edited only in `packages/cli/` is lost on the next sync.
- Re-read the neighbouring skills you touched. If a rule moves or a section is renamed, every skill that points at it has to be updated in the same turn.

Apply the doc changes in the same turn when the human says yes; list them as files changed. Never edit approvals, evidence, or signed sections.

## Incident variant (post-mortem)

Same file, plus at the top: impact (who, how long, how much), detection (alert or human?), time to mitigate, time to root cause, and the runbook row that was missing or wrong. Every "action item" is a task in a feature with an owner and a date, or it does not exist.

## Rules

- Blameless. Systems and artifacts, not people.
- Evidence over memory: cite file names and timestamps.
- Ten lines of proposed changes beat ten pages of narrative.
- If nothing needs to change, write that; a clean retro is data too.
