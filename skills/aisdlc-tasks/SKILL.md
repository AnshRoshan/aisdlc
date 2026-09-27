---
name: aisdlc-tasks
description: Generate or repair tasks.md from the plan's work breakdown so every task is a small tracer bullet, traceable to a requirement, checkable, and ordered by its blocking edges, then run the read-only consistency pass and pass gate G2 (artifact consistency) with a PASS / CONCERNS / FAIL readiness verdict. Use when `aisdlc next` reports TASKS, when the user says "break this down", "tickets", "to-tickets", "analyze", "is this consistent", or when `aisdlc trace` reports uncovered requirements or unknown references.
license: MIT
metadata:
  author: aisdlc
  version: "2.0"
  stage: tasks
---

# aisdlc-tasks

Tasks are the unit of agent work and the unit of evidence. One task, one failing test at a named seam, one green run, one checkbox.

## File contract: `docs/features/<slug>/tasks.md`

```markdown
# Tasks: <title>

- [ ] T1 [R:<Requirement Name>] <what will be true when done> {seam: <seam>, est: 2h}
- [ ] T2 [R:<Requirement Name>, R:<Another>] <...> {after: T1}
- [x] T3 [R:<Requirement Name>] <done tasks are checked, never deleted>
```

Parser rules (`npx aisdlc-cli trace` and G2 rely on these):
- Line starts with `- [ ]` or `- [x]`, then `T<n>`, then one `[R:...]` group with comma-separated requirement names, then the title.
- Requirement names must match `### Requirement:` headings in `spec.md` exactly (case-insensitive, whitespace-trimmed). Unknown references fail G2.
- Every requirement needs at least one task. Uncovered requirements fail G2.
- Optional trailing metadata in braces: `{seam: http:/export, est: 2h, after: T1, owner: agent}`. `after:` declares blocking edges; keep the list in an order that respects them so "first unchecked task" is always runnable.

## Sizing heuristics

- **Tracer bullets.** T1 is the thinnest end-to-end path through the primary seam. Each later task widens behaviour; none is "the database layer".
- If a task needs more than one PR, split it.
- If a task's test cannot be named in one sentence (`Scenario: <name>`), split it or return to the spec.
- One seam per task where possible; a task touching two seams is usually two tasks.
- Separate "make it work" from "make it observable" (logging, metrics) when the kind is backend or infra.
- Put migrations (expand step and contract step separately), feature flags, rollback hooks and characterization tests as their own tasks; they are the ones people forget.
- Do not add tasks that map to no requirement. Want one? That is `aisdlc-delta`.

## Waves (what may run at the same time)

`{after: T1}` is a blocking edge; everything else is an opportunity. Derive the waves and say them out loud:

- **Wave 1** = every task with no `after:` pointing at an unchecked task.
- **Wave N** = tasks whose `after:` dependencies are all satisfied by waves `< N`.
- **Same seam ⇒ same wave is forbidden.** Two tasks that touch the same seam, file, or migration run sequentially even if their edges say otherwise — the edge list knows dependencies, not collisions.
- Never put an expand and a contract migration step, or a flag-add and a flag-remove, in the same wave.

Order `tasks.md` so the first unchecked line is always runnable, and print the wave plan when handing off.

## Procedure

1. Copy the plan's work breakdown into `tasks.md` in the exact format above. Add `{seam:}` from the plan's Seams section and `{after:}` edges. Derive waves.
2. Run `npx aisdlc-cli trace <slug>`; fix unknown/uncovered until clean.
3. **Consistency pass — read-only, report first.** The CLI proves the three artifacts *link*; only you can prove they *agree*. Read `spec.md`, `plan.md` and `tasks.md` against each other and report, without editing anything:
   - **Contradictions:** a plan decision, constraint or data-model line that cannot hold together with a requirement (e.g. spec says "retry three times", plan says "no retries"; spec §4 says PII is never logged, design logs it).
   - **Conflicts inside the spec:** two requirements that no single implementation can satisfy, or an ambiguous quantifier ("quickly", "many", "as needed") that two tasks resolved differently.
   - **Dangling seams:** a task's `{seam:}` that does not appear in the plan's Seams, the spec §7, or the repo. Name the file or route you looked for.
   - **Phantom work:** a task whose title describes behaviour no scenario covers, or a task that is really two.
   - **Lost unknowns:** a Research row or `[NEEDS CLARIFICATION]` that no task resolves.
   Anything found goes back to the artifact that owns it: spec problems → `aisdlc-delta`, plan problems → back to `aisdlc-plan` (which makes G1 stale — say so), task problems → fix here. Never resolve a contradiction by quietly rewording the spec.
4. Run `npx aisdlc-cli gate G2 <slug>`; G2 also re-validates the spec, checks it is signed, and checks the plan has `## Traceability`. Paste the result.
5. **Readiness verdict** — one line, three values, no fourth:
   - `PASS` — G2 green, consistency pass found nothing blocking.
   - `CONCERNS` — G2 green but the consistency pass logged issues that are safe to build past. List each with the task that will absorb it. Build may start; the concerns are re-read at G4.
   - `FAIL` — G2 red or a contradiction is unresolved. Do not hand off. Name the owning artifact and the fix.
6. Hand off to `aisdlc-implement` starting with the first unchecked task in wave 1, unless `aisdlc next` says otherwise.

## Quick lane

Usually 1-4 tasks. Same format, same G2, same verdict — the consistency pass is one read, not a ceremony. If you are writing task eight, the lane is wrong: `npx aisdlc-cli lane <slug> standard`.

## Smells to refuse

- A trace that is green because a requirement was matched to a token task ("T7: handle errors").
- Handing off on `CONCERNS` without printing the concerns.
- Two tasks in one wave that write the same file or migration.
- Fixing a spec/plan contradiction by editing whichever artifact was open at the time.
- A task with no observable outcome, or an outcome only the author could confirm.
- Reordering or renumbering completed tasks.
