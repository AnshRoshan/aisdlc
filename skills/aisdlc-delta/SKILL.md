---
name: aisdlc-delta
description: Handle any change of intent after the spec is signed - new requirement, changed behaviour, removed scope, a bug that reveals the spec was wrong. Use when the user says "actually", "change of plan", "can we also", "that's not what I meant", or when implementation discovers behaviour the spec does not cover. Writes a delta file, updates the spec explicitly, and invalidates stale approvals on purpose.
license: MIT
metadata:
  author: aisdlc
  version: "2.0"
  stage: any
---

# aisdlc-delta

Specs change. Silent changes are the problem, not change itself. A delta makes the change visible, reviewable and traceable.

## When a delta is required

- Any edit to `### Requirement:` blocks or scenarios after §5 is signed.
- Any behaviour you are about to implement that no scenario describes.
- Any task you want to add that does not map to an existing requirement.
- Any acceptance row you want to change from `fail` to `n/a`.

## Before writing the delta

- Load `aisdlc-grill` for one round if the change is not crisp: what exactly changes, for whom, what must keep working, what is the rejection criterion for the new behaviour. Give recommended answers.
- Check the lane. A delta that adds a subsystem, touches auth/money/PII, or changes a public contract upgrades the lane (`npx aisdlc-cli lane <slug> standard|regulated`); say so in the delta's Impact.
- Ponytail check: is the lazier response to the trigger to *remove* scope rather than add it? Offer that option explicitly.

## Procedure

1. Create `docs/features/<slug>/deltas/D<n>-<short-slug>.md`:

   ```markdown
   # Delta D<n>: <title>

   ## Trigger
   <what happened: user request, bug, discovery during T4, incident>

   ## Change
   | Requirement | Before | After | Type |
   |---|---|---|---|
   | <name> | WHEN ... SHALL ... | WHEN ... SHALL ... | modify / add / remove |

   ## Impact
   - Tasks affected: T2, T5 (reopen) · new: T9
   - Approvals invalidated: G1 (plan hash changes), G4
   - Risk: ...

   ## Decision
   Requested-by: <human>   Approved-by: ______  Date: ______
   ```

2. Apply the change to `spec.md` exactly as the table says. Update `plan.md` traceability and `tasks.md` (reopen affected tasks by unchecking them; add new ones).
3. Run `npx aisdlc-cli check spec` and `npx aisdlc-cli trace <slug>`. Both clean.
4. Tell the human, explicitly: "D<n> changes the plan/spec hash; G1 and G4 approvals are now stale and must be re-signed." Then run `npx aisdlc-cli next <slug>`; the state will move backwards. That is correct behaviour, not a bug.

## Bug-driven deltas

When `aisdlc-debug` finds that the expected behaviour is not what any scenario describes, the delta's Trigger names the failing test and its red evidence file. The regression test becomes the new scenario's proof.

## What is *not* a delta

- Refactors with no behaviour change (tests still green, no scenario touched).
- Fixing a typo in prose outside requirement blocks.
- Adding a test for an existing scenario.
