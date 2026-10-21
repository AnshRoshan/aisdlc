# Progress Tracker

The only file that updates constantly. States are mutually exclusive.

Current phase: 3 - evidence is portable · Current goal: get G1 signed, then ship 0.2.1 so the kit is installable.

## In progress

- market-readiness T1/T2: workflow files changed (Pages Node 22, npm OIDC publishing with provenance, token fallback). Done only when a branch deploy is green and a prerelease is installable, which needs a push and the npm trusted-publisher setting.
- market-readiness T10: `aisdlc ci` and `.github/workflows/gates.yml` exist, and `aisdlc export --format sarif` now produces the file; only the SARIF upload step is missing.

## Completed

- 2026-10-21: phase 3 export - `aisdlc export` writes an in-toto Statement v1, a DSSE envelope, copies of every artifact and evidence record, SARIF 2.1.0 and `verify.md`; `export --verify` recomputes all digests offline and exits 1 naming the mismatched file, catching edited records, hidden files, invented files and a rewritten statement. `--sign` is an external adapter that degrades honestly. New `packages/cli/src/export.js`, 5 tests.
- 2026-10-21: phase 2 MCP - `aisdlc mcp --stdio` serves read-only `aisdlc_next` and `aisdlc_status`; write-shaped tool names are refused with the CLI command a human must run. `next --json` and MCP now share one builder so they cannot drift. New `packages/cli/src/mcp.js`, 4 tests.
- 2026-10-21: T5 copy corrections in README, PRODUCT, packages/cli/README and docs/conventions: current harness names, the new verbs, and the narrowed positioning claim instead of "enforcement, not templates".
- 2026-10-21: T6, T7, T8, T9, T12. Approvals bind `head`/`tree`/`git`; G1/G4/G5 fail on post-signature content; `report` shows the binding and exits 3 on drift; `doctor` prints a per-harness enforcement level with reasons and `--json`; `aisdlc ci`; `antigravity` and `devin` targets with legacy notices for `gemini-cli`/`windsurf`. Decisions D-09, D-10, D-11; overrides F-04, F-05; F-02 partially answered.
- 2026-10-20: Project context scaffold (AGENTS.md, CLAUDE.md, context/, docs/glossary.md, memory.md). Decisions D-01 to D-08 recorded.
- 2026-10-20: Market research captured in docs/COMPETITORS.md section 10 and docs/RESEARCH.md section 12.
- 2026-10-20: Program artifacts created at docs/features/market-readiness/ (spec, plan, tasks, acceptance, rollout, runbook, guardrails). G6 passes structurally; approvals empty; no other gate claimed.

## Up next

- Sign G1 on `docs/features/market-readiness/spec.md` (or reject the F-04 override and send the work back).
- T3/T4: tag `v0.2.1`, publish, release, confirm the live Pages content.
- T11: needs a harness that documents a hook able to block a tool call. None found for Codex, Copilot, Cursor, Antigravity or OpenCode.
- T13: portable manifests. Paths are confirmed, enum spellings and `$schema` are not validated by a real install yet.
- T20: the eval harness. Any published number must come from a run that actually happened.
- T21: launch post and the positioning page.

## Session notes

- 2026-10-21: pushed as six signed commits (`b14ebf2..c932f34`), dated to the day the work was done. `ci` and `deploy site` both green on main; the live site now carries the October harness names and the rendered plan skill.
- 2026-10-21: `publish cli` failed to parse twice. The annotation names the rule: GitHub does not expose `secrets` in a job-level `if` either (Unrecognized named-value, line 25), after the same mistake at step level. One job now, branching in the shell on an env var holding the secret. The lesson is a process one: a workflow change is only verified by a push, so it must never be described as done before the run exists.
- 2026-10-21: 87/87 CLI tests, 12/12 guard tests, 6/6 site tests; corpus check PASS with 23 commands cross-checked; `aisdlc ci market-readiness` exits 0; eight evidence records on the feature, all green, and the acceptance rows cite the newest full run.
- 2026-10-21: export, verifier, signer adapter and MCP were implemented before their tests, then tested in the same session. Recorded as finding F6; do not repeat it.
- 2026-10-20: `main` = `origin/main` at `b14ebf2`; `claude plugin validate .` passes.
- Pages: `deploy site` is green on main as of 2026-10-21; it had been failing since 2026-10-15 on Node 20.
- `aisdlc-cli` is not on npm; the publish run failed with `ENEEDAUTH`.
- The `v0.2.0` tag points at `25a6ff9`, one commit behind HEAD, and has no GitHub release.
