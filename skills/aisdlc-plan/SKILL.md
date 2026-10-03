---
name: aisdlc-plan
description: Produce plan.md - architecture, constitution check, explicit decisions with alternatives and ladder rung, data model, interface contracts, research that resolves every unknown, seams, tracer-bullet breakdown, smoke path, risks, and a Traceability table mapping every requirement to tasks - then ask a human for G1. Use when `aisdlc next` reports PLAN, the user says "plan this", "architecture", "how should we build it", or a spec just got signed. The agent never approves its own plan.
license: MIT
metadata:
  author: aisdlc
  version: "2.0"
  stage: plan
---

# aisdlc-plan

The plan is the only place where "how" is decided. It is short, it is boring unless the spec forces otherwise, it is traceable, and it is approved by someone who did not write it.

## Inputs

`docs/constitution.md`, `spec.md` (signed §5), `docs/taste.md`, `docs/glossary.md`, `baseline.md` (brownfield), `docs/decisions/*.md` (ADRs you must respect or explicitly supersede). If the spec is unsigned or invalid, stop and go back to `aisdlc-spec`. Explore the code the seams touch before you write a word; a plan that names files that do not exist is fiction.

## File contract: `docs/features/<slug>/plan.md`

```markdown
# Plan: <title>

## Architecture
<3 to 10 sentences. Name components with glossary terms. One ASCII diagram of dependencies (A -> B).
For backend / data / infra / ml kinds also draw the sequence or data flow: who calls what, in order,
and where the data lands.>

## Constitution check
| Principle (from docs/constitution.md) | Verdict | Evidence / justification |
|---|---|---|
| The spec is the source of truth | comply | no spec edits in this plan |
| Migrations are reversible | violate | irreversible backfill; justified because <reason> |

## Decisions
| # | Decision | Alternatives considered | Why | Ladder rung |
|---|---|---|---|---|
| 1 | native `<dialog>` for the modal | headless-ui, custom portal | zero deps, a11y built in | 4 (platform) |

## Research & unknowns
| # | Unknown | Decision | Rationale | Alternatives considered |
|---|---|---|---|---|
| 1 | which queue for retries | Postgres SKIP LOCKED | already running, <50 msg/s, no new infra | BullMQ, SQS |

## Data model
<entities, key fields, relationships, state transitions, retention. One table per entity or a short
list. Write `n/a: no new or changed data` when nothing changes.>

## Interface contracts
<every interface this feature exposes: HTTP routes, CLI commands, exported functions, events, file
formats, UI affordances — with the shape of each. `n/a: internal only` when nothing crosses a boundary.>

## Seams (tests attach here; brownfield: toggles too)
- <seam>: <interface> · existing/new · toggled by <flag> (brownfield)

## Threat model (regulated lane; optional otherwise)
| Asset | Threat | Mitigation | Requirement |
|---|---|---|---|

## Work breakdown (tracer bullets)
- T1 [R:<Requirement Name>] <verb phrase; thin end-to-end slice through the seam, behind a failing test>
- T2 [R:<Requirement Name>, R:<Other>] ...

## Traceability
| Requirement | Tasks |
|---|---|
| <Requirement Name> | T1, T3 |

## Verification strategy
Kind-specific: <from KIND hints: e.g. component tests + visual diff + a11y audit>. Full-suite command: `<cmd>`.

## Smoke path
<the shortest end-to-end proof a stranger can run: exact commands, in order, and what they should
observe. This is what a reviewer runs before reading the diff.>

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|

## Rollback thinking
<what is reversible, what is not, in one paragraph; migrations are expand/contract; flags default off>
```

Rules:
- `## Traceability` heading is mandatory (G2 checks for it) and **every** requirement must appear with at least one task.
- Task IDs are `T<n>`, sequential, and reference requirement names exactly as written in the spec.
- No task larger than a day. If it is, split it.
- Every task is phrased so that a failing test can be written before it, at a seam named in this plan or the spec.
- **Tracer bullets, not layers.** The first task cuts the thinnest end-to-end path through the real seam (request in, observable result out). Later tasks widen it. Never "T1 schema, T2 service, T3 API, T4 UI".
- **Decisions carry their alternatives and ladder rung.** Load `aisdlc-ponytail` (or the official `ponytail`) and climb the ladder for each decision: exists already? stdlib? platform? installed dependency? one line? Only then custom. A new dependency needs a row explaining why the rung above it failed.
- Respect existing ADRs; superseding one is its own row in Decisions and a new ADR file.
- **Constitution check is not optional and not decorative.** One row per principle in `docs/constitution.md`. `comply` needs one line of evidence; `n/a` needs a reason. A `violate` row is only allowed with a written justification a human could reject — if you cannot justify it, the plan is wrong, not the principle. Unjustified violations stop the plan: fix the design, or escalate to the human who can amend the constitution (`aisdlc-retro` owns amendments).
- **Research & unknowns is where guesses go to die.** Every `[NEEDS CLARIFICATION]` the spec left in §6 must already be closed before §5 was signed; this table is for *technical* unknowns discovered while planning (which library, which consistency model, which migration strategy). One row each: decide, say why, list what you rejected. An unknown with no row is an unknown you are carrying into the build silently.
- **Fetch the facts off the main thread, keep the writing.** Where the harness supports subagents, dispatch a read-only researcher on a fast, low-cost tier (Claude Code: the `aisdlc-researcher` subagent type, installed by `aisdlc init`) to pull current docs, enumerate credible options rather than the first hit, and confirm each link exists and says what it claims. Then *you* write the table and the Decisions rows: a delegated sentence is an unowned one, and a URL nobody checked becomes a spec citation with a typeface.
- **Data model and contracts exist even when small.** They are what the reviewer checks the diff against. `n/a` is a legitimate entry; a blank section is not.
- **Smoke path must be runnable as written.** No placeholders for commands, no "run the tests". The point is that a reviewer who has never seen the repo can prove the feature works in under a minute.

## Procedure

1. Read `docs/constitution.md` and take its principles one at a time. Present 2-3 architectures in chat, each ≤5 lines with the biggest risk and what it makes hard later, plus your recommendation (skip if `aisdlc-brainstorm` already did this; reuse its choice). Load `aisdlc-grill` in "grill the plan" mode for the decisions that remain open; one round is usually enough.
2. Draft the plan. Keep architecture boring unless the spec forces otherwise; note the exception in Decisions.
3. Run the **constitution check**: every principle gets a verdict with evidence. Fix the design for any violation you cannot justify in one sentence.
4. Drain the unknowns: list each technical unknown, decide it, record decision + rationale + alternatives. If an unknown cannot be decided from the repo or the docs, that is one round of `aisdlc-grill` with a recommended answer — not a coin flip and not a silent assumption.
5. Fill the data model, interface contracts and smoke path. `n/a` is fine; empty is not. Backend/data/infra: add the sequence or data-flow diagram next to the dependency graph.
6. Write `tasks.md` from the breakdown (or hand to `aisdlc-tasks`) and run `npx aisdlc-cli trace <slug>`. Zero uncovered requirements, zero unknown references.
7. **Review the plan before you ask anyone to sign it.** Fresh context, not yours: dispatch a subagent with only two inputs — the path to `spec.md` and the path to `plan.md` — or, with no subagents, re-read the pair in a pass where you argue against the plan. Ask three questions: does every requirement have a task, does any decision contradict the spec or the constitution, and can a stranger run the smoke path as written? Loop until it comes back clean. A human signing a plan the author never stress-tested is how G1 becomes a rubber stamp.
8. Run `npx aisdlc-cli gate G1 <slug>`. It will fail on the approval check; that is expected.
9. Ask a human who is **not** the author to review and run:
   `npx aisdlc-cli approve G1 <slug> --by "<their name>" --note "<why>"`
   Approvals bind to the plan's hash. If you edit the plan after approval, the approval becomes stale and G1 fails again. Say so proactively. Regulated lane needs two distinct approvers. A human may approve **with concerns** (`--note "…"`): the concerns go in `## Risks` with an owner, and they are re-read at G4 — that is the difference between a concern and a blocker.
10. Confirm with `npx aisdlc-cli next <slug>` that state is TASKS or BUILD.

## Re-plan (the plan is wrong, the spec is fine)

No delta: behaviour is unchanged, only the route. Edit `plan.md`, uncheck every task the old plan invalidated with a one-line why, run `npx aisdlc-cli trace <slug>`, then tell the human plainly: "G1 is stale by design — the plan hash changed; re-sign when you have read the new one." If the fix changes what a requirement *says*, stop: that is `aisdlc-delta`, not a re-plan.

## Quick lane

The quick lane skips G1: no approval is needed, but `plan.md` still exists in compact form (Architecture in 2 sentences, Constitution check, Decisions with rungs, Data model one line, Seams, Work breakdown, Traceability, Smoke path). Ten lines is fine. The human's acceptance at G4 is the review.

## Smells to refuse

- A plan with no alternatives column filled in.
- A new dependency with no row explaining why the platform or an installed one did not suffice.
- Tasks that are layers instead of slices.
- A constitution check where every row says `comply` but none says *how*.
- An unknown carried into BUILD without a Research row ("we'll see when we get there").
- A blank Data model or Interface contracts section instead of `n/a`.
- A smoke path that says "run the tests" instead of naming the command.
- "We'll figure out rollback later."
- Editing the plan after approval without telling the human the approval is now stale.
