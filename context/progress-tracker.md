# Progress Tracker

The only file that updates constantly. States are mutually exclusive.

Current phase: release - `arsdlc@0.3.0` is live on npm · Current goal: ship 0.3.1 with the corrected package metadata, create the GitHub release, register the npm trusted publisher for provenance, then close the manifest and eval gaps that need a real client or a real run.

## In progress

- market-readiness T1/T2: workflow files changed (Pages Node 22, npm OIDC publishing with provenance, token fallback). Done only when a branch deploy is green and a prerelease is installable, which needs a push and the npm trusted-publisher setting.
- market-readiness T10: `arsdlc ci` and `.github/workflows/gates.yml` exist, and `arsdlc export --format sarif` now produces the file; only the SARIF upload step is missing.

## Completed

- 2026-10-21: phase 3 export - `arsdlc export` writes an in-toto Statement v1, a DSSE envelope, copies of every artifact and evidence record, SARIF 2.1.0 and `verify.md`; `export --verify` recomputes all digests offline and exits 1 naming the mismatched file, catching edited records, hidden files, invented files and a rewritten statement. `--sign` is an external adapter that degrades honestly. New `packages/cli/src/export.js`, 5 tests.
- 2026-10-21: phase 2 MCP - `arsdlc mcp --stdio` serves read-only `arsdlc_next` and `arsdlc_status`; write-shaped tool names are refused with the CLI command a human must run. `next --json` and MCP now share one builder so they cannot drift. New `packages/cli/src/mcp.js`, 4 tests.
- 2026-10-21: T5 copy corrections in README, PRODUCT, packages/cli/README and docs/conventions: current harness names, the new verbs, and the narrowed positioning claim instead of "enforcement, not templates".
- 2026-10-21: T6, T7, T8, T9, T12. Approvals bind `head`/`tree`/`git`; G1/G4/G5 fail on post-signature content; `report` shows the binding and exits 3 on drift; `doctor` prints a per-harness enforcement level with reasons and `--json`; `arsdlc ci`; `antigravity` and `devin` targets with legacy notices for `gemini-cli`/`windsurf`. Decisions D-09, D-10, D-11; overrides F-04, F-05; F-02 partially answered.
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
- 2026-10-21: `publish cli` cost three pushes to get right. Attempt one read `secrets` in a step `if`; attempt two read it in a job `if` (GitHub annotation: `Unrecognized named-value: 'secrets'`); attempt three moved the branch into the shell, and the repo's own `arsdlc scan` CI job then rejected assigning the secret inline into `NODE_AUTH_TOKEN` inside the run script. Final shape: a mode step writes an output, two publish steps gate on it, and the token arrives through `env:`. The rule is procedural, not YAML: run `node bin/arsdlc.js scan` and `arsdlc ci` locally before pushing plumbing.
- 2026-10-21: 87/87 CLI tests, 12/12 guard tests, 6/6 site tests; corpus check PASS with 23 commands cross-checked; `arsdlc ci market-readiness` exits 0; eight evidence records on the feature, all green, and the acceptance rows cite the newest full run.
- 2026-10-21: `arsdlc ci` with no argument fails on `docs/features/demo`, which is deliberately unfinished scaffolding. So this repo dogfoods the command in `ci.yml` scoped to `market-readiness`, and the reusable gate workflow keeps `workflow_call` plus `workflow_dispatch` instead of a `pull_request` trigger - a check that is red on its own fixture teaches people to ignore it.
- 2026-10-21: renamed to `arsdlc` at identifier level (873 occurrences, 102 files, 20 skill folders, bin, guard module, `arsdlc.json`, both manifests). History docs keep `aisdlc` in prose; only their link targets were fixed after the checker found 30 dead ones. Unscoped `arsdlc` is free on npm, PyPI and GitHub.
- 2026-10-21: the unscoped publish was refused - npm `403 Package name too similar to existing package ai-sdlc` (live, 138 versions, same category). Package was moved to `@anshroshan/arsdlc` for that one attempt; the scoped name was **never published** and the rename to `arsdlc` took the unscoped slug anyway. The bin, repo, plugin id and marker always stayed `arsdlc`. A registry 404 means unclaimed, not claimable.
- 2026-10-21: `arsdlc@0.3.0` published from a laptop and is live (`latest` → 0.3.0). npm first parked the name at `0.0.0-stage` in a staged-release review, which cleared the same day; that hold is an anti-typosquat mechanism, not a rejection. No `--provenance`: a laptop has no OIDC identity, so `npm audit signatures` shows nothing for it.
- 2026-10-21: package-UI pass for 0.3.1 - 205 scoped `npx @anshroshan/arsdlc` strings became `npx arsdlc`, `packages/cli/package.json` gained `author`, `bugs`, `changelog`, a Pages `homepage` and attestation-flavoured keywords, the CLI description was cut to one readable line, and the package README got badges plus an honest no-provenance note. The CHANGELOG entry that claimed 0.2.1 was the "first published release" as `aisdlc-cli` was false (404 on the registry) and is corrected rather than footnoted.
- 2026-10-21: `ci` and `deploy site` green on `b7b6bba` and on the `v0.3.1` tag; the live site now shows `npx arsdlc init` on both the hero and the docs install step. `publish cli` on `v0.3.1` failed exactly where F-01 says it must: npm answered `E404` for the PUT because no trusted publisher is registered for the name. Before refusing it, the job had already **published a signed provenance statement for `arsdlc@0.3.1` to the Sigstore transparency log** (logIndex 3353477021) - so a failed CI publish is not fully clean; it leaves an attestation pointing at a version that does not exist on the registry. Nothing was published and no release was created.
- 2026-10-21: npm's Insights panel scores `arsdlc@0.3.0` Supply Chain Security **77** (Vulnerability 100, Quality 88, Maintenance 100, License 100) and the `0.0.0-stage` stub **51**. Read from the registry record, not guessed: `dist` has **no `attestations` key** (no build provenance), `_npmUser` is the human account (laptop publish, no CI identity), the package is minutes old with one maintainer, `api.npmjs.org/downloads` returns "package arsdlc not found", dependents 0, repo created 2026-09-06 with 0 stars and no release. The 51 is npm's own placeholder - `"Temporary package placeholder for staged publishing"`, `stub: true` - not a verdict on this project. What the panel cannot be read from outside an owner login: the exact weights, and whether the `ai-sdlc` name-similarity heuristic contributes. Counter-evidence gathered for the README: zero runtime dependencies, no `preinstall`/`install`/`postinstall` (`prepack` runs at pack time only), and all 38 tarball files blob-match the public `v0.3.0` commit, so the missing attestation is compensated by a reproducible check.
- 2026-10-21: re-pointing `v0.3.1` at `7119890` (the tag first landed on `b7b6bba`, and only the doc correction after it belongs on the release) cost a **second** dangling attestation - `publish cli` fires on tag push, wrote logIndex 3353537406 for `arsdlc@0.3.1`, then hit the same `E404`. The lesson for this repo's own plumbing: while the trusted publisher is unregistered, a tag push is not a dry run, and moving a tag is not free. Publish 0.3.1 from the laptop or register the publisher first; do not re-tag again.

- 2026-10-21: `v0.2.1` was tagged at `5bcbab6` and never published. `ci` was green on the tag, `deploy site` green on main, and `publish cli` failed with `E404` because the trusted publisher is not registered on npm yet (F-01, answered). Nothing is half-published: no version on the registry and no GitHub release, since that step follows a successful publish.
- 2026-10-21: export, verifier, signer adapter and MCP were implemented before their tests, then tested in the same session. Recorded as finding F6; do not repeat it.
- 2026-10-20: `main` = `origin/main` at `b14ebf2`; `claude plugin validate .` passes.
- Pages: `deploy site` is green on main as of 2026-10-21; it had been failing since 2026-10-15 on Node 20.
- `arsdlc` is on npm: 0.3.0 live, no provenance. `aisdlc`, `aisdlc-cli` and `@anshroshan/aisdlc` are 404 and stay that way.
- `v0.2.0` points at `25a6ff9` and `v0.2.1` at `5bcbab6`; both are superseded tags with no GitHub release, and no release exists for `v0.3.0` either.
