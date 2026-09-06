---
name: aisdlc-tasks
description: Generate or repair tasks.md from the plan's work breakdown so every task is a small tracer bullet, traceable to a requirement, checkable, and ordered by its blocking edges, then pass gate G2 (artifact consistency). Use when `aisdlc next` reports TASKS, when the user says "break this down", "tickets", "to-tickets", or when `aisdlc trace` reports uncovered requirements or unknown references.
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

## Procedure

1. Copy the plan's work breakdown into `tasks.md` in the exact format above. Add `{seam:}` from the plan's Seams section and `{after:}` edges.
2. Run `npx aisdlc-cli trace <slug>`; fix unknown/uncovered until clean.
3. Run `npx aisdlc-cli gate G2 <slug>`; G2 also re-validates the spec, checks it is signed, and checks the plan has `## Traceability`. Paste the result.
4. Hand off to `aisdlc-implement` starting with the first unchecked task, unless `aisdlc next` says otherwise.

## Quick lane

Usually 1-4 tasks. Same format, same G2. If you are writing task eight, the lane is wrong: `npx aisdlc-cli lane <slug> standard`.
