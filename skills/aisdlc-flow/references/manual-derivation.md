# Deriving the state by hand

Read this only when `npx aisdlc-cli` cannot run: no network, no Node, a restricted sandbox. Do not
stall and do not guess. Say "derived manually; CLI unavailable", then use this order.

1. No `docs/brief.md` and empty `spec.md` → `DISCOVER`.
2. `spec.md` has no `### Requirement:` blocks, a requirement without `SHALL`/`MUST` or without
   `#### Scenario:`, or any `[NEEDS CLARIFICATION` → `SPECIFY`.
3. §5 `Approved-by:` is underscores → `SPECIFY` (owner: human), unless the lane is `spike`.
4. Lane `standard`/`regulated`: no `plan.md` content, or no `approvals.json` entry
   `{gate:"G1", by:<not the author>}` → `PLAN`.
5. Any `- [ ] T<n>` in `tasks.md` → `BUILD` (next task = first unchecked). Any `T<n>` referencing a
   requirement name not in the spec, or a requirement with no task → `TASKS`.
6. No `evidence/*.json` with `label` `full` and `exitCode: 0` newer than the last task check-off →
   `VERIFY`. (A repo whose `aisdlc.json` says `test.gate: none-by-design` needs any recorded green
   run instead; say which rule you applied.)
7. `acceptance.md` rows not all `pass` with real evidence, or unsigned → `ACCEPT`. A row citing an
   evidence file that is not in `evidence/` is not evidence.
8. Lane `standard`/`regulated`: `rollout.md` without `## Rollback` steps or no G5 approval →
   `RELEASE`; `guardrails.yaml` without `budgets`/`kill_switch` or `runbook.md` without Symptoms →
   `OPERATE`.
9. Otherwise `DONE`.

## What you may not do in this mode

You may not write approvals, evidence files, or signatures by hand. The chain and the hashes are the
point of them.

Evidence without the CLI means: run the command, save its **full** output to
`evidence/<timestamp>-<label>.log`, and record `{command, exitCode, startedAt, label,
note: "recorded manually; CLI unavailable"}` in a sibling `.json`. Say so in your report, and say it
again when the CLI comes back, because a hand-made entry cannot carry the output hash the tool would
have computed and the next reviewer needs to know that.

An approval you cannot make the CLI record is a blocker to report, not a step to simulate: name the
human, the gate, and the artifact hash they are waiting on.
