---
name: aisdlc-spec
description: Write or repair an EARS specification (spec.md) that passes `npx aisdlc-cli check spec`. Use when `aisdlc next` reports SPECIFY, when the user says "write the spec", "spec it", "requirements", "to-spec", or when a spec has [NEEDS CLARIFICATION] markers, requirements without SHALL, or requirements without scenarios. Covers happy, failure and edge scenarios, non-functional requirements, test seams and the project's glossary terms; uses aisdlc-grill to close open questions; has a compact mode for the quick lane. The spec is the source of truth for everything downstream.
license: MIT
metadata:
  author: aisdlc
  version: "2.0"
  stage: specify
---

# aisdlc-spec

A spec is a contract a stranger could verify. Every requirement is testable; every ambiguity is marked, never papered over. You could hand it to a competitor's engineer and get the same product back.

## EARS in 30 seconds

| pattern | shape | use for |
|---|---|---|
| Ubiquitous | THE SYSTEM SHALL <response> | always-true properties (limits, formats, security) |
| Event-driven | WHEN <trigger> THE SYSTEM SHALL <response> | the happy paths |
| State-driven | WHILE <state> THE SYSTEM SHALL <response> | modes, in-progress, degraded |
| Unwanted behaviour | IF <condition> THEN THE SYSTEM SHALL <response> | failures, abuse, bad input |
| Optional feature | WHERE <feature is present> THE SYSTEM SHALL <response> | flags, tiers, platforms |

One SHALL per requirement. No "and/or", no "quickly", no "user-friendly", no "etc.". Numbers, not adjectives. Use the nouns from `docs/glossary.md`; if you need a new noun, add it there first.

## File contract: `docs/features/<slug>/spec.md`

The validator (`npx aisdlc-cli check spec docs/features/<slug>/spec.md`) enforces exactly this:

```markdown
# Spec: <title>

## 1. Context
Kind: **<kind>**. Lane: **<lane>**. Verify model: <what proves it works>.
Problem: <one sentence from the brief>. Users: <roles>.

## 2. Goals / Non-goals
- Goal: ...
- Non-goal: ...

## 3. Requirements (EARS)
### Requirement: <Short Unique Name>
WHEN <trigger> THE SYSTEM SHALL <response>.

#### Scenario: <happy path name>
- GIVEN <precondition>
- WHEN <action>
- THEN <observable result with a number or exact value>

#### Scenario: <failure or edge name>
- GIVEN ...
- WHEN ...
- THEN ...

## 4. Constraints (non-functional, also EARS)
- THE SYSTEM SHALL <security / privacy / performance / a11y / compatibility property>.

## 5. Acceptance bar
Approved-by: ______  Date: ______

## 6. Open questions
| # | Question | Owner | Status |
|---|---|---|---|

## 7. Seams (where tests attach)
- <seam>: <public interface: HTTP route / CLI / exported function / UI flow> · exists today: yes/no
```

Hard rules the validator checks:
- At least one `### Requirement:` block. Names are unique; tasks reference them verbatim as `[R:<name>]`.
- Every requirement contains `SHALL` or `MUST` and at least one `#### Scenario:`.
- Zero `[NEEDS CLARIFICATION: ...]` markers remain when you claim the spec is ready. While drafting, **use them liberally**; a marker is honest, a guess is not.
- §5 `Approved-by:` is left for a human. Never fill it. Underscores mean unsigned. (Lane `spike` does not require a signature.)
- §6 rows whose Status is not `done`/`resolved`/`closed`/`n/a` are reported as warnings.

Rules the validator cannot check but the reviewer will:
- Every requirement has at least one **unhappy** scenario (IF/THEN) unless it is genuinely impossible to fail; say so if so.
- Every THEN is observable from outside the system (response, file, row, pixel, log line), with a value a test can assert.
- Section 4 has, at minimum, one line each for auth (who may not), data (what is stored/retained/PII), and a performance or size budget with a number, or explicitly `n/a: <why>`.
- Section 7 names the seams; prefer existing seams, the highest level that still isolates the behaviour, and as few as possible. Tests will live there and nowhere else.

## Procedure

1. Read `docs/brief.md`, `docs/taste.md`, `docs/glossary.md`, `baseline.md` (brownfield) and any `deltas/`. Skim the code the seams will touch; facts you find are not questions you ask.
2. Draft requirements from the brief's must-haves: one requirement per must-have, one scenario per observable path (happy, failure, edge). Add ubiquitous requirements for the non-functional needs.
3. For each unknown write `[NEEDS CLARIFICATION: <question>]` inline and add a §6 row. Then load `aisdlc-grill` in "grill the spec" mode: work the open questions as a frontier, one round at a time, each with a recommended answer. Resolve the markers with the answers; leave nothing implicit.
4. **Adversarial pass** (do this yourself before asking a human): for each requirement ask "what input breaks this?", "what if it happens twice?", "what if it happens while <other state>?", "who must not be able to do this?". Add scenarios or mark clarifications.
5. Run `npx aisdlc-cli check spec <path>`; fix until 0 errors. Paste the validator output in your reply. (CLI unavailable? Check the hard rules by hand and say you did.)
6. Ask the human to sign §5 (name + date) or run `npx aisdlc-cli approve`-equivalent in their tool. Do not proceed to `aisdlc-plan` until `aisdlc next` moves to PLAN (or to TASKS/BUILD in the quick lane).

## Compact mode (lane `quick`)

1-3 requirements, each with a happy and a failure scenario, §4 with the auth/data lines, §7 with one seam. Skip §6 if empty. Same validator, same signature. Should take under ten minutes; if it is taking longer, the lane is wrong: upgrade with `npx aisdlc-cli lane <slug> standard`.

## Spike mode (lane `spike`)

One requirement: `THE SYSTEM SHALL answer: <question>` with one scenario whose THEN names the measurement and the threshold that decides. §1 gets the answer and the recommendation once the probe has run. No signature required; the evidence file is the deliverable.

## Smells to refuse

- Requirements that describe implementation ("use Redis") rather than behaviour. Implementation goes in `plan.md` Decisions.
- Scenarios with no THEN that a test could assert.
- A requirement whose only scenario is the happy path.
- "Etc.", "and so on", "as appropriate", "handle errors gracefully".
- Two requirements that can both be satisfied by the same trivial implementation (merge them) or that contradict (resolve now, not in code).
- Filling in §5 yourself, ever.
