# Deriving the state by hand

Read this only when `npx arsdlc` cannot run: no network, no Node, a restricted sandbox. Do not
stall and do not guess. Say "derived manually; CLI unavailable", then use this order.

1. No `docs/brief.md` and empty `spec.md` → `DISCOVER`.
2. `spec.md` has no `### Requirement:` blocks, a requirement without `SHALL`/`MUST` or without
   `#### Scenario:`, or any `[NEEDS CLARIFICATION` → `SPECIFY`.
3. §5 `Approved-by:` is underscores → `SPECIFY` (owner: human), unless the lane is `spike`.
4. Lane `standard`/`regulated`: no `plan.md` content, or no `approvals.json` entry
   `{gate:"G1", by:<not the author>}` → `PLAN`.
5. Lane `quick`/`standard`/`regulated`: missing plan/tasks, missing `## Traceability`, unknown or
   uncovered requirement references, or missing/unnamed §9 value sources → `TASKS`.
6. Any `- [ ] T<n>` in `tasks.md` → `BUILD` (next task = first unchecked).
7. No recorded green `full` run (a `spike` run also qualifies in the spike lane), open tasks, or
   unverified secrets scan → `VERIFY`. `test.gate: none-by-design` allows the latest recorded run only if green
   when no full run exists and config has a non-placeholder `test.reason`; a failed latest full run still
   blocks. Records also need current source fingerprints and checksums; manual logs do not qualify.
8. Non-spike lanes: acceptance rows not all `pass` with recorded evidence, unsigned, or missing
   independent/degraded reviewer notes → `ACCEPT`.
9. Lane `standard`/`regulated`: missing rollback steps or G5 approval → `RELEASE`; missing real
   guardrail budgets/kill switch, runbook Symptoms, or ML eval thresholds → `OPERATE`.
10. Otherwise report **tentatively complete; CLI validation required**, not `DONE`. Manual inspection
    cannot verify approval hashes, chain integrity or all gate checks. Regulated approvals require two
    distinct humans. Resume with `arsdlc next` when the CLI returns.

## What you may not do in this mode

You may not write approvals, evidence files, or signatures by hand. The chain and the hashes are the
point of them.

Without the CLI, save the command, exit code, timestamp and **full** output outside `evidence/`
(for example, `manual-runs/<timestamp>-<label>.log`), after checking for secrets. These are diagnostic
logs, not gate evidence. Report `IMPLEMENTED-NOT-VERIFIED`; re-run through `arsdlc evidence` when the
CLI returns. Never create a hand-made `.json` that the CLI could mistake for a recorded run.

An approval you cannot make the CLI record is a blocker to report, not a step to simulate: name the
human, the gate, and the artifact hash they are waiting on.
