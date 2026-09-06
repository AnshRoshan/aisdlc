---
name: aisdlc-brownfield
description: Safe entry into an existing codebase. Use when the feature touches a repo that already exists, when the user says "legacy", "refactor", "migrate", "we can't break X", or when discovery reveals a must-never-change system. Produces a baseline, golden-master/characterization tests and named seams before any delta-only change is allowed.
license: MIT
metadata:
  author: aisdlc
  version: "2.0"
  stage: discover
---

# aisdlc-brownfield

Rewrite is the most expensive word in software. The gateway into an old system is: **baseline, characterize, seam, then change by delta only**.

## Step 0: Facts first, then questions

Everything in the baseline that a command can answer, you answer: stack, build/test commands (run them, record exit codes), churn, TODO density, dependency age, test coverage if a report exists. Only the pain points, the must-never-change list and the risk appetite are questions for the human; ask them with `aisdlc-grill` in one round, each with a recommended answer drawn from what you read. Add every legacy term you had to decode to `docs/glossary.md`.

## Step 1: Baseline (read-only, 15 minutes max)

Produce `docs/features/<slug>/baseline.md`:

- **Stack & entrypoints:** languages, frameworks, build & test commands that actually work today (run them, record exit codes with `npx aisdlc-cli evidence <slug> -- <command>`).
- **Hotspots:** top 10 files by churn (`git log --format= --name-only | sort | uniq -c | sort -rn | head`), plus TODO/FIXME density.
- **Pain points** from the user, verbatim.
- **Must-never-change list:** public APIs, data formats, schedules, integrations. Each becomes a golden-master candidate.
- **Unknowns:** things you could not determine. Never guess; list them as `[NEEDS CLARIFICATION]` so `aisdlc-spec` blocks until resolved.

## Step 2: Characterization tests (golden masters)

For each must-never-change item, write a test that pins **current** behaviour, even if that behaviour looks wrong. The purpose is detection, not judgement.

- Prefer snapshot/approval style at the boundary (HTTP response, CLI output, file output, DB row shape).
- Record the first green run as evidence: `npx aisdlc-cli evidence <slug> -- <test command>`.
- Add a spec requirement per golden master: `WHILE the migration is in progress THE SYSTEM SHALL preserve <behaviour>.`

## Step 3: Seams (choose the laziest safe one)

Name the places where new behaviour can be introduced without editing the old path:

- Strangler-fig facade (route new calls, leave old ones).
- Branch by abstraction (interface + old impl + new impl + toggle).
- Expand/contract for schema changes (add, dual-write, migrate, remove).

Write them into `plan.md` under `## Seams`, each with the toggle or flag that controls it. Prefer the seam that touches the fewest legacy files and needs the fewest new abstractions (ponytail ladder: reuse an existing interface before inventing one). A characterization test at the seam is mandatory before the seam is opened.

## Step 4: Hand off

- Discovery continues in `aisdlc-discover` with the baseline attached.
- Every change from here on is a **delta** against the baseline (`aisdlc-delta`). If you find yourself editing an untested legacy path, stop and add a characterization test first.
