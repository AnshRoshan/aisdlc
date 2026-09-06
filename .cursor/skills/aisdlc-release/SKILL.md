---
name: aisdlc-release
description: Prepare and gate a release - rollout.md with strategy and rollback (G5, human approved), then guardrails.yaml and runbook.md for runtime budgets, kill switch and on-call actions (G6). Use when `aisdlc next` reports RELEASE or OPERATE, when the user says "ship it", "deploy", "rollout", "runbook", or "how do we roll back".
license: MIT
metadata:
  author: aisdlc
  version: "2.0"
  stage: release
---

# aisdlc-release

Shipping is a reversible decision or it is a gamble. This skill makes it reversible and makes the on-call person's night boring.

## Lane check first

`npx aisdlc next <slug> --json` → read `lane`. Lanes `spike` and `quick` do not require G5/G6; they show as `skipped` and the feature is DONE after G4. If a quick-lane change turns out to need a flag, a migration contract step, or a runbook entry, the lane was wrong: `npx aisdlc lane <slug> standard` and continue here. Regulated lane: two approvers on G5 and a **rollback rehearsal** recorded as evidence (`--label rollback-drill`) before approval is requested.

## G5: Release approval

Write `docs/features/<slug>/rollout.md`:

```markdown
# Rollout: <title>

## Strategy
<flag name> · canary <n>% → <n>% → 100% · bake time per step · success signal per step

## Preconditions
- G4 green (acceptance signed)
- Migration applied in expand mode / backward compatible

## Rollback
1. Flip <flag> off.
2. Revert tag <tag>.
3. Run smoke: <command>.
Owner: <role>. Max time to rollback: <minutes>.

## Comms
Changelog entry · status page · stakeholder note

Approved-by: ______  Date: ______
```

G5 requires a `## Rollback` section with concrete steps and a human approval bound to the current rollout hash:
`npx aisdlc approve G5 <slug> --by "<release owner>"` (never the author, never you).

## G6: Runtime guardrails

Write `guardrails.yaml`:

```yaml
budgets:
  latency_p95_ms: 800
  error_rate_pct: 1.0
  monthly_cost: 5000        # in the team's currency
kill_switch: <FLAG_NAME>
alerts:
  - on: error_rate_pct > budget for 5m
    do: page owner, flip kill_switch
review_after_days: 14
```

And `runbook.md`:

```markdown
# Runbook: <title>

## Symptoms → Actions
| Symptom | First action | Escalate to |
|---|---|---|

## Dashboards / logs
- ...

## Known failure modes
- ...

## Contacts
On-call rotation: ...
```

G6 requires `budgets`, `kill_switch` and a runbook with a Symptoms section. For ML features, add `evals.md` with golden and adversarial cases plus thresholds; evals are tests.

## Ponytail applies here too

The smallest rollout that is still reversible wins: one flag, one canary step, one smoke command. Do not invent a five-stage canary for a copy change. Do not skip the flag for a schema change.

## After release

- Record the deploy as evidence: `npx aisdlc evidence <slug> --label deploy -- <deploy or smoke command>`.
- Schedule the guardrails review (`review_after_days`). Budget breaches are new deltas, not silent tuning.
- Run `npx aisdlc next <slug>`; when it says DONE, load `aisdlc-retro`.
