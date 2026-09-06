---
name: aisdlc-brainstorm
description: The front door for any new request. Use BEFORE any creative or engineering work when the user says "I have an idea", "let's build", "brainstorm", "options", "how should we approach", "what would you do", or gives a vague one-line request. Classifies the request into a lane (spike, quick, standard, regulated) so the amount of process matches the stakes, explores 2-3 approaches with trade-offs, applies the ponytail ladder to pick the simplest one that works, and gets explicit human approval before routing to discover, spec, implement, or debug. Never writes code.
license: MIT
metadata:
  author: aisdlc
  version: "2.0"
  stage: discover
---

# aisdlc-brainstorm

Turn "I want X" into a classified, approved intent. Ceremony scales with the task; the approval gate never does.

<HARD-GATE>
Do not write code, scaffold files, run migrations, or invoke `aisdlc-implement` until you have told the human what you intend, which lane it runs in, and they have said yes. This holds for a one-line config change and for a new subsystem alike. What scales with simplicity is the artifact, never the approval.
</HARD-GATE>

## Step 1: Look before you ask (2 minutes, silent)

- Read `docs/constitution.md`, `docs/taste.md`, `docs/glossary.md`, `docs/brief.md` if they exist.
- Run `npx aisdlc-cli status` (if the CLI is unavailable, list `docs/features/*/feature.json`). An existing feature may already own this request; if so, hand to `aisdlc-flow` and stop.
- Skim the code the request touches: entrypoints, existing flow, tests, recent `git log -20 --oneline`.
- Note facts you found so you never ask the human for them.

## Step 2: Classify the lane and say it out loud

| lane | when | required gates | process |
|---|---|---|---|
| `spike` | a feasibility question ("can we…", "is it possible…", "how slow is…"); output is an **answer**, code is throwaway | G3 (evidence of the run) | question + probe plan in 3 sentences → nod → investigate cheaply → report a recommendation. Anything built is labelled throwaway. |
| `quick` | a bounded change to a flow that **already exists in this repo**: new flag, small endpoint, one-file fix, a bug with a clear repro | G2, G3, G4 | short spec (1-3 requirements, scenarios), tasks, TDD, evidence, human acceptance. No plan approval, no rollout, no runbook. |
| `standard` | new capability, new subsystem, anything that changes interfaces others depend on, anything a user would notice as a feature | G1-G6 | full aisdlc: discover → spec → plan (human-approved) → tasks → build → verify → review → release → operate |
| `regulated` | money, PII, auth, compliance, safety, irreversible data changes, public API contracts | G1-G6, two approvers, evals where ML | as standard plus `policy.minApprovals` = 2, threat-model section in the plan, mandatory rollback rehearsal evidence |

Rules:
- **Bounded measures the repo, not your familiarity.** If there is no existing flow to change, it is not `quick`.
- **When in doubt, take the heavier lane.** Reaching for a lighter label to skip work *is* the doubt.
- **The ratchet is one-way.** Hidden complexity discovered mid-task upgrades the lane: stop, say so, run `npx aisdlc-cli lane <slug> <lane>`. Nothing downgrades mid-task.
- A bug report is `quick` if it reproduces in one existing flow; otherwise it is `standard` with `aisdlc-debug` in the loop.

Announce: "This looks **quick**: it changes the existing `/export` route only. I'll write a 2-requirement spec and skip plan approval. Override?"

## Step 3: Interview only what changes the outcome

Load `aisdlc-grill`. Budget by lane: spike 0-1 round, quick 1 round (≤5 questions), standard 2-3 rounds, regulated 3+ rounds including the threat questions. Always ask the **rejection criteria** question ("what would make you send this back?") for quick and above.

## Step 4: Explore approaches (standard and regulated; optional for quick)

Present **2-3 genuinely different approaches**, each in ≤5 lines: shape, what it touches, biggest risk, what it makes easy later, what it makes hard later. Then your recommendation with one reason.

Run the **ponytail ladder** over the candidates before recommending (load `aisdlc-ponytail`, or the official `ponytail` skill if installed):
does this need to exist at all → does the repo already have it → does the stdlib / platform / an installed dependency cover it → can it be one line → only then custom code. Prefer the highest rung that satisfies the spec. Say which rung you stopped at.

Ask the human to pick. Their choice goes into `plan.md` `## Decisions` later; write it down now in your working notes.

## Step 5: Present the intent and stop

One block, then wait for an explicit yes:

```
Intent:   <one sentence, user's words>
Lane:     <spike|quick|standard|regulated> because <reason>
Approach: <chosen approach, one line> (ladder rung: <n>)
Touches:  <files/modules/tables>
Proves:   <the command or observation that shows it works>
Skipped:  <what we are deliberately not doing, and when to revisit>
Next:     <aisdlc-discover | aisdlc-spec | aisdlc-debug | spike probe>
```

Presenting the intent and starting work in the same message is skipping the gate.

## Step 6: Route

On yes:
- `spike` → `npx aisdlc-cli new "<question>" --kind <kind> --lane spike`; write the question as the single requirement (`THE SYSTEM SHALL answer: <question>` with a scenario naming the measurement); run the probe with `npx aisdlc-cli evidence <slug> --label spike -- <command>`; write the answer and recommendation into `spec.md` §1. State becomes DONE once evidence exists.
- `quick` → `npx aisdlc-cli new "<title>" --kind <kind> --lane quick`; load `aisdlc-spec` (compact mode).
- `standard` / `regulated` → if `docs/brief.md` for this idea is missing load `aisdlc-discover`, else `npx aisdlc-cli new ... --lane <lane>` then `aisdlc-spec`. Brownfield repo? Load `aisdlc-brownfield` first.
- Existing repo without `docs/taste.md`? Run `aisdlc-taste` once (≤6 questions) before the spec.

## Red flags (stop and re-read the gate)

| thought | reality |
|---|---|
| "Too simple to need a design" | Simple means a two-sentence design, not none. Present, then wait. |
| "They approved the spike, so the follow-up is approved" | Each task gets its own classification and its own yes. |
| "I understand this kind of app" | Bounded measures the repo, not you. New project = standard. |
| "It grew, but I'm nearly done" | Upgrade the lane now. Say so. |
| "I'll start while they read it" | The gate is the approval, not the length of the design. |
