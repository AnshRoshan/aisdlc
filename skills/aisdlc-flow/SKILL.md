---
name: aisdlc-flow
description: The aisdlc router. Use at the start of ANY engineering task in a repo with an aisdlc.json or docs/features/ directory, when the user says "next", "where are we", "what should I do", "continue", "status", or before any stage work. Reads state from disk via `npx aisdlc-cli next` (or from the files by hand when the CLI is unavailable), respects the feature's lane, reads any handoff, then hands off to exactly one aisdlc-* skill. Never guesses state from chat history.
license: MIT
metadata:
  author: aisdlc
  version: "2.0"
  stage: any
---

# aisdlc-flow: the router

You are operating inside the aisdlc process. Agents write code; aisdlc runs the process.
Your first job is always to find out **where the feature actually is**, from disk, never from memory.

## The eight invariants (non-negotiable)

1. **The spec is the source of truth.** Code is generated output. Intent changes go through a delta, never a quiet edit.
2. **Gates are transitions, not suggestions.** No evidence, no progress.
3. **Segregation of duties.** The approver is never the author or the prompter. You (the agent) never approve anything.
4. **Humans own the acceptance bar.** `Approved-by:` lines are human-signed. Do not fill them in.
5. **Stranger-trust.** "Done" means a run artifact exists in `evidence/`. Saying "tests pass" without a recorded run is the cardinal sin.
6. **Disk is state. Chat is not.** Derive status from files and `npx aisdlc-cli next`, never from what was said earlier.
7. **Secrets never land in files.** Placeholders only. Fail closed.
8. **Fail loud, never fake green.** If infra is down, the result is `IMPLEMENTED-NOT-VERIFIED`, not PASS.

In Claude Code the `aisdlc-guard` mod may hold one of your calls and say which invariant it protects.
That is the disk rule arriving early, not an obstacle to route around: do the thing it names (record the
run, open the delta, ask the human). It fails open when it cannot decide, so a hold is a signal, not noise.

## Procedure

1. **Classify the request in one line** before touching state:
   - a new idea, vague ask, "let's build", "options?" → `aisdlc-brainstorm` (it picks the lane and comes back here).
   - a bug, stack trace, "broken", "slow", "flaky" → `aisdlc-debug` (it files the task, then returns here).
   - "actually…", "can we also…", "that's not what I meant" on a signed spec → `aisdlc-delta`.
   - "grill me", "poke holes" → `aisdlc-grill`. "handoff", "I need to stop" → `aisdlc-handoff`. "retro" → `aisdlc-retro`.
   - "analyze", "is this consistent", "does the plan match the spec" → `aisdlc-tasks` (read-only consistency pass; it never edits).
   - "how is it going", "where did the time go", "is the evidence stale", "how healthy is this repo" → run `npx aisdlc-cli report` (all features) or `report <slug>`, and answer from its numbers. That is measurement, not a stage; do not move state on it.
   - "the plan is wrong, not the spec", "we're going about it backwards", "this approach won't work" → `aisdlc-plan` in re-plan mode (see its Re-plan section; G1 goes stale on purpose, no delta unless behaviour changes).
   - anything else about an existing feature → continue below.
2. Run `npx aisdlc-cli status`. If the user named a feature (or only one exists), run `npx aisdlc-cli next <feature> --json`.
3. Read the JSON: `state`, `lane`, `blocking[]`, `skill`, `owner`, `nextTask`, `gates`. Trust it over any prior conversation.
4. If `docs/features/<slug>/handoff.md` exists and is newer than the latest evidence or approval, read it for **context** (decisions, gotchas, exact next steps). Disk wins on **state**; the handoff never overrides `aisdlc next`.
5. Read `docs/taste.md` (calibration: verbosity, laziness level, review strictness) and `docs/glossary.md` (vocabulary) if present. Quote them when they drive a choice.
6. Announce, in one short paragraph: lane, state, blocking items, and the **single** next action with its owner. Then load the skill named in `skill`.
7. Never skip a stage. If `owner` is `human` (approval, signature, decision), stop and ask the human for exactly that; do not simulate it, do not "prepare it so it's ready", do not keep building.
8. **Discovery may return "do not build".** `aisdlc-discover` closes with a verdict — build / spike first / defer / do not build. Only `build` creates a feature folder. If the brief's `## Verdict` says otherwise, report it and stop; do not route to SPECIFY to be helpful.
9. When a stage's work is complete, re-run `npx aisdlc-cli next <feature>` to confirm the transition happened on disk. Paste its output.
10. If context is getting long or the session is ending mid-stage, load `aisdlc-handoff` before you stop.

## If `npx aisdlc-cli` is unavailable (no network, no Node, restricted sandbox)

**Read `references/manual-derivation.md` in full and follow it before you do anything else.** It is
the by-hand state order, and the list of things you may not simulate in that mode. Do not read it when
the CLI works; do not improvise the derivation from memory, because the order is the check.

## Lanes (how much process a feature carries)

Set at `aisdlc new --lane <lane>` and stored in `feature.json`. `aisdlc-brainstorm` chooses it; the ratchet only goes up (`npx aisdlc-cli lane <slug> standard`).

| lane | required gates | spec signature | typical |
|---|---|---|---|
| `spike` | G3 (evidence of the probe) | not required | feasibility question; output is an answer |
| `quick` | G2, G3, G4 | required | bounded change to an existing flow; bug fix |
| `standard` | G1-G6 | required | new capability |
| `regulated` | G1-G6, two approvers | required | money, PII, auth, irreversible data, public contracts |

Skipped gates show as `skipped` in `aisdlc next`; they are not failures.

## State to skill map

| state | meaning | load |
|---|---|---|
| `DISCOVER` | no brief yet | `aisdlc-brainstorm` if the idea is unclassified, else `aisdlc-discover` (+ `aisdlc-brownfield` in an existing repo, `aisdlc-taste` once per project) |
| `SPECIFY` | spec missing, invalid EARS, has `[NEEDS CLARIFICATION]`, or unsigned | `aisdlc-spec` (uses `aisdlc-grill` for open questions) |
| `PLAN` | spec ok, plan missing or G1 unapproved | `aisdlc-plan` then ask a human for `aisdlc approve G1` |
| `TASKS` | plan approved, tasks missing or untraced (G2) | `aisdlc-tasks` |
| `BUILD` | open tasks remain | `aisdlc-implement` (with `aisdlc-ponytail` + `aisdlc-craft`; `aisdlc-debug` for fix tasks) |
| `VERIFY` | tasks done, G3 not green (no run evidence or secrets found) | `aisdlc-verify` |
| `ACCEPT` | G3 green, acceptance table incomplete or unsigned (G4) | `aisdlc-review` + human sign-off |
| `RELEASE` | G4 passed, rollout unapproved (G5) | `aisdlc-release` |
| `OPERATE` | released, guardrails/runbook missing (G6) | `aisdlc-release` (operate section) |
| `DONE` | every required gate green | `aisdlc-retro` |

## Companions (optional, recommended)

aisdlc bridges to four maintained third-party skills and degrades gracefully without them:

- **ponytail** (DietrichGebert/ponytail): minimal-code discipline. `aisdlc-ponytail` uses the official one when installed.
- **grilling** (mattpocock/skills): the interview primitive. `aisdlc-grill` uses the official one when installed.
- **code-craft** (AnshRoshan/ansh-other-skills): line-level clean-code craft. `aisdlc-craft` uses the official one when installed.
- **code-quality-tools** (AnshRoshan/ansh-other-skills): lint/dead-code/complexity/security CLI runner. `aisdlc-quality` uses the official one when installed.

`npx aisdlc-cli doctor` reports which are present; `npx aisdlc-cli addon ponytail|grilling|code-craft|quality-tools|all` installs them. Never install without asking.

## Output contract for every turn

- One line: `lane · state → next action → who owns it (agent / human)`.
- If blocked, name the blocker and exactly what unblocks it: who, what artifact or credential (name, never the value), and what you will do the moment it arrives. "Waiting" without that is not a status.
- If you changed files, list them and re-run `npx aisdlc-cli next`.
- Never write the words "approved", "signed", or "PASS" about work that has no artifact behind it.
- Never say "should work", "probably passes", or "looks good" in place of a recorded run.

## Reference files

Read a file only when its trigger fires. They are paths relative to this skill's folder.

| file | read it when |
|---|---|
| `references/manual-derivation.md` | `npx aisdlc-cli` cannot run at all |

## Where things live

```
aisdlc.json                      project config (docs dir, kind defaults, harnesses, policy)
docs/constitution.md             the invariants, project-specific additions
docs/brief.md                    discovery output
docs/taste.md                    taste profile (style, testing philosophy, verbosity, laziness)
docs/glossary.md                 the project's shared language (domain terms, one line each)
docs/decisions/*.md              ADRs for cross-feature decisions
docs/features/<slug>/
  feature.json                   kind, lane, author, created
  spec.md  plan.md  tasks.md     the spine
  acceptance.md  rollout.md      G4 / G5 artifacts
  guardrails.yaml  runbook.md    G6 artifacts
  evidence/*.json                recorded runs (command, exit code, hash)
  approvals.json                 hash-chained, human-signed
  deltas/*.md                    change requests
  handoff.md  retro.md           session continuity, lessons
  baseline.md                    brownfield only
```
