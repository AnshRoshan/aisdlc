---
name: aisdlc-plan
description: Produce plan.md with architecture, explicit decisions (alternatives, ponytail ladder rung), seams, work breakdown as tracer bullets, risks, and a Traceability table that maps every spec requirement to tasks, then request human G1 approval. Use when `aisdlc next` reports PLAN, when the user says "plan this", "architecture", "how should we build it", or after a spec is signed. Plans are approved by a human who is not the author (SoD); the agent never approves. Regulated lane adds a threat model and two approvers.
license: MIT
metadata:
  author: aisdlc
  version: "2.0"
  stage: plan
---

# aisdlc-plan

The plan is the only place where "how" is decided. It is short, it is boring unless the spec forces otherwise, it is traceable, and it is approved by someone who did not write it.

## Inputs

`spec.md` (signed §5), `docs/taste.md`, `docs/glossary.md`, `baseline.md` (brownfield), `docs/decisions/*.md` (ADRs you must respect or explicitly supersede). If the spec is unsigned or invalid, stop and go back to `aisdlc-spec`. Explore the code the seams touch before you write a word; a plan that names files that do not exist is fiction.

## File contract: `docs/features/<slug>/plan.md`

```markdown
# Plan: <title>

## Architecture
<3 to 10 sentences. Name components with glossary terms. One ASCII diagram of dependencies (A -> B).>

## Decisions
| # | Decision | Alternatives considered | Why | Ladder rung |
|---|---|---|---|---|
| 1 | native `<dialog>` for the modal | headless-ui, custom portal | zero deps, a11y built in | 4 (platform) |

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

## Procedure

1. Present 2-3 architectures in chat, each ≤5 lines with the biggest risk and what it makes hard later, plus your recommendation (skip if `aisdlc-brainstorm` already did this; reuse its choice). Load `aisdlc-grill` in "grill the plan" mode for the decisions that remain open; one round is usually enough.
2. Draft the plan. Keep architecture boring unless the spec forces otherwise; note the exception in Decisions.
3. Write `tasks.md` from the breakdown (or hand to `aisdlc-tasks`) and run `npx aisdlc-cli trace <slug>`. Zero uncovered requirements, zero unknown references.
4. Run `npx aisdlc-cli gate G1 <slug>`. It will fail on the approval check; that is expected.
5. Ask a human who is **not** the author to review and run:
   `npx aisdlc-cli approve G1 <slug> --by "<their name>" --note "<why>"`
   Approvals bind to the plan's hash. If you edit the plan after approval, the approval becomes stale and G1 fails again. Say so proactively. Regulated lane needs two distinct approvers.
6. Confirm with `npx aisdlc-cli next <slug>` that state is TASKS or BUILD.

## Quick lane

The quick lane skips G1: no approval is needed, but `plan.md` still exists in compact form (Architecture in 2 sentences, Decisions with rungs, Seams, Work breakdown, Traceability). Ten lines is fine. The human's acceptance at G4 is the review.

## Smells to refuse

- A plan with no alternatives column filled in.
- A new dependency with no row explaining why the platform or an installed one did not suffice.
- Tasks that are layers instead of slices.
- "We'll figure out rollback later."
- Editing the plan after approval without telling the human the approval is now stale.
