# Decisions Log

One entry per hard technical decision, written when it is made. Defaults already assumed: local-first, no accounts, no telemetry, zero runtime dependencies unless a decision says otherwise.

---

## D-01: Adopt project-context-system alongside the arsdlc pipeline - 2026-10-20

Trigger: the repo had no `AGENTS.md`, `CLAUDE.md`, `context/` or `memory.md`; `.gitignore` actively excluded them. Agents re-derived the project from README and git history every session.
Options considered: (A) AGENTS.md only, (B) full context system with per-change docs duplicated into `context/feature-specs/`, (C) full context system with `docs/features/` as the single per-change source.
Chosen: C. `context/` owns per-project state; `docs/features/<slug>/` owns per-change artifacts; `context/feature-specs/` is an index, never a second copy.
Lost alternative: B, because two copies of the same spec is the failure mode the context system itself warns about.
Cost paid: more files to keep current; one more reading order for a new session.
Reversibility: easy. Delete `context/` and the two root files; the CLI and skills are untouched.
Correctness policy: `docs/features/` is authoritative for a change. If it disagrees with `context/`, the feature file wins and the context file is corrected at the next sync.

## D-02: Publish with npm trusted publishing, not a long-lived token - 2026-10-20

Trigger: the publish workflow failed with `ENEEDAUTH`; `arsdlc` is still a 404 on npm.
Options considered: (A) keep `NPM_TOKEN`, (B) GitHub OIDC trusted publishing with `--provenance`, (C) manual local publish.
Chosen: B, with a documented fallback to A only if the account cannot use trusted publishing.
Lost alternative: A, because a long-lived token is a standing credential and the workflow already failed silently in the sense that nothing shipped.
Cost paid: one-time npm account configuration; provenance requires a public repo and OIDC permissions.
Reversibility: easy. Revert the workflow to token auth.
Correctness policy: a failed publish must never create a release or move a tag. Never publish a version whose tests did not run.

## D-03: Bind approvals to `head` and `tree`, not only artifact text - 2026-10-20

Trigger: AWS AI-DLC fingerprints exact plan bytes and Spec Kitty refuses merges after a post-approval commit; arsdlc hashes only artifact text, so it cannot see that the tree moved.
Options considered: (A) keep artifact hashes, (B) add `head` + `tree` to every approval entry, (C) sign commits and verify signatures.
Chosen: B. Additive fields; gates fail when the tree changed outside `evidence/`; no-git projects record `git: unavailable` and keep the current behavior with a printed degradation.
Lost alternative: C, because it imposes identity and key management before the product has shipped.
Cost paid: re-approval when an unrelated commit lands; one more git call per approval and gate evaluation.
Reversibility: painful. Old approvals lack the fields; they remain readable but cannot prove tree binding. Do not rewrite history.
Correctness policy: hash binding proves the artifact did not change, not that a human read it. The human-reading guarantee stays a process claim, stated honestly.

## D-04: Harness parity through native hooks where stable, plus a CI gate - 2026-10-20

Trigger: the guard mod is Claude Code only; AI-DLC covers seven harnesses natively.
Options considered: (A) stay Claude-only, (B) build native adapters for every harness, (C) native adapters where the hook API is stable, a reusable CI gate everywhere else, and an honest `doctor` matrix.
Chosen: C.
Lost alternative: B, because several harness hook APIs are new and will churn; a broken adapter is worse than a declared CI-only path.
Cost paid: a CI workflow and a maintenance surface per adapter.
Reversibility: easy. Disable an adapter; the CI gate remains.
Correctness policy: never claim enforcement a harness does not have. `doctor` must print the real level.

## D-05: Evidence export uses in-toto Statement v1 + DSSE; signing is external - 2026-10-20

Trigger: approvals and evidence are hash-chained but nothing can consume them; audit and CI tools expect standard formats.
Options considered: (A) a custom export JSON, (B) in-toto/DSSE with an optional signature, (C) Sigstore-only.
Chosen: B. The core writes the statement and envelope with built-ins; `ssh-keygen -Y sign` or `cosign` can sign when present, and verification works offline either way.
Lost alternative: C, because it adds an external dependency and a network trust root to the default path.
Cost paid: format maintenance and a verifier to test.
Reversibility: easy. The export is a new command; nothing consumes it internally yet.
Correctness policy: an unsigned export proves integrity against tampering after the fact, not authorship. State that in the output.

## D-06: Keep the name; compete on a distinct phrase - 2026-10-20

Trigger: searching "AI-DLC" returns AWS's kit; `arsdlc` reads like a fork. A rename was declined previously.
Options considered: (A) rename, (B) sub-brand, (C) keep the name and own descriptive language ("cross-vendor process evidence").
Chosen: C. No rename without a new decision.
Lost alternative: A, already declined; the migration cost is not justified before launch.
Cost paid: permanent search collision and a harder discovery story.
Reversibility: painful.
Correctness policy: never imply affiliation with AWS AI-DLC.

## D-07: Keep the CLI zero-dependency; integrations shell out - 2026-10-20

Trigger: new needs (MCP, signing, attestations) tempt dependency additions.
Options considered: (A) add packages, (B) vendor code, (C) built-ins with optional external binaries.
Chosen: C. MCP is a small stdio JSON-RPC loop; signing is optional and external; formats are JSON written with built-ins.
Lost alternative: A, because `npx` install weight and supply-chain surface are part of the product promise.
Cost paid: more code to write and test ourselves; no library shortcuts.
Reversibility: easy per integration, but the default must stay zero-dep.
Correctness policy: an optional tool missing must degrade with a printed reason, never fail silently or fake a signature.

## D-08: One program spec, phases in tasks - 2026-10-20

Trigger: the market gaps are coupled (shipping enables distribution; binding enables exports), and splitting into eight specs before the first ship adds ceremony without reducing risk.
Options considered: (A) one spec per gap, (B) one program spec with phased tasks, (C) backlog only.
Chosen: B. Split a phase into its own feature folder if it grows past five tasks or crosses a new boundary.
Lost alternative: A, because the first three tasks share the same workflow files and release decision.
Cost paid: a larger spec and a longer traceability table.
Reversibility: easy. Move tasks into a new folder and leave a pointer.
Correctness policy: no phase starts before the previous phase's evidence is recorded or the human accepts the risk in writing.

---

## D-09: Prefer real symlinks in link mode, junctions only as fallback - 2026-10-20

Trigger: the installer used a Windows junction for every `--link` install because symlinks required elevation. The maintainer's machine now has Developer Mode, so the privilege assumption no longer holds.
Options considered: (A) keep junctions everywhere, (B) require symlinks and fail without the privilege, (C) try a relative symlink first and fall back to a junction on `EPERM`/`EINVAL`.
Chosen: C.
Lost alternative: A, because a junction is invisible to git as a link, so tooling treats the installed skills as real directories and duplicates them; B, because it would break installs on machines without Developer Mode.
Cost paid: one try/catch and a printed mode; link shape now differs between machines, which tests must tolerate.
Reversibility: easy. Delete the symlink attempt to return to junction-only behavior.
Correctness policy: the printed mode must match the filesystem. A junction reported as a symlink is a lie; link resolution itself must never be approximate.

## D-10: Two checklist branches instead of one 111-item file - 2026-10-20

Trigger: the maintainer supplied a 111-item system-design list and required full coverage inside the skill. All 111 in one sub-file measured 9,711 B, over the 9 KB sub-file budget.
Options considered: (A) one file and raise the budget, (B) one file and prune content, (C) split into the two branches the items actually serve, (D) inline in `arsdlc-plan`'s router.
Chosen: C, 79 items in `system-design-checklist.md` and 32 in `operations-checklist.md`, each with its own trigger and hot-path budget.
Lost alternative: A, because a ceiling fitted to the current file is how a budget stops meaning anything; D, because the plan router would have gone from 10 KB to 20 KB and every plan run would pay for K8s probes.
Cost paid: two triggers to place correctly; a plan that crosses both boundaries reads about 20 KB, now budgeted and checked.
Reversibility: easy. Merge the files back if the budget changes for a stated reason.
Correctness policy: full 111-item coverage is not negotiable and is verified by number, so no item can be dropped by pruning prose. Which cluster a number sits in may be reorganized.

## D-11: Tree drift is content-based, not commit-count - 2026-10-21

Trigger: implementing D-03 showed that a signed tree compared by commit identity fails after any commit, even one that changes nothing outside the feature folder, and a revert-then-recommit sequence passes by accident.
Options considered: (A) fail when the head differs from the signed head, (B) fail when content differs from the signed tree, ignoring process artifacts, (C) narrow to a configured source glob per feature.
Chosen: B - `git diff --name-only <signed head>` plus untracked files, filtered through `isProcessArtifact`.
Lost alternative: A, because it punishes unrelated churn and would have been turned off within a week; C, because a glob per feature is a second configuration system for one question.
Cost paid: one `git diff` and one `ls-files` per distinct signed head on every gate evaluation; a change that nets to zero content is treated as no drift.
Reversibility: easy; the recorded fields stay useful either way.
Correctness policy: what a signature proves is "this content, at this tree", not "no commits happened". Commit counts may be irrelevant; content equality never is.

---

## FLAGGED assumptions

## F-04: Implementation started before G1 was signed - 2026-10-20 (attached to market-readiness)

The maintainer said to work end to end, so tasks T1 onwards started while the spec's §5 is still unsigned. G1 is therefore **skipped, not passed**: the tree-binding and doctor work below has no human plan approval behind it yet. Nobody has decided that a pre-G1 implementation is the norm; it needs a real call, either a signature or a revert.

## F-07: v0.2.1 published while G1 and G5 are unsigned - 2026-10-21 (attached to market-readiness)

The maintainer said to push and release, so the tag and the npm publish go out with G1 never signed and G5 (release approval) empty. Nobody has decided that shipping past two gates is the norm. This differs from F-04 in one material way: a merge can be reverted, an npm version cannot be unpublished. If this becomes acceptable, the lane model should say so explicitly rather than leaving it to a chat instruction.

## F-05: Single-approver SoD deadlock - 2026-10-20

`arsdlc new` seeds `author` from the git identity, and G1 refuses an approval whose name equals the author. With one maintainer, the standard lane cannot be signed by anyone. `market-readiness` records the agent as author so the human can sign, which is honest but is a workaround, not a design. Nobody has decided how solo projects should pass G1.

## F-01: npm trusted publishing is available for this account - 2026-10-20, answered 2026-10-21

It is not configured, and the assumption is now replaced with a fact. The `v0.2.1` run took the OIDC path correctly (`id-token: write`, no token, setup-node wired), and npm answered the PUT with `E404 Not Found - PUT https://registry.npmjs.org/arsdlc`. That is npm rejecting an unknown package identity, not a broken workflow: the publisher has to be registered on the npm side first, per package name, pointing at this repo and `publish.yml`. Nothing was published and nothing is half-published - the registry still returns 404 and the GitHub release was not created, because that step follows a successful publish.

Two ways to finish T2, both a maintainer action: add the trusted publisher on npm and re-run the workflow for the tag, or set `NPM_TOKEN` and let the mode step take the token path (which publishes without provenance). Re-running is the cheaper of the two, and provenance is worth the npm UI visit.

## F-02: Harness hook APIs are stable enough to target - 2026-10-20, partially answered 2026-10-21

We assumed Codex, Copilot and Antigravity expose usable lifecycle hooks. A research pass on primary sources found: Codex documents lifecycle hooks only as a plugin component for **manually installed desktop plugins**, not the public directory; Copilot plugins carry `com.github.copilot/hooks/hooks.json`; no source confirmed a hook that can **block** a tool call the way Claude Code's `PreToolUse` does. Marketplace paths did confirm: `.agents/plugins/marketplace.json` (Codex) and `.github/plugin/marketplace.json` (Copilot), plus Agent Plugins 1.0 requiring `$schema`, `name`, `version` and `description` in `plugin.json`. So T11 and T13 stay open rather than guessed: `doctor` reports `ci` for those harnesses, which is the level we can actually prove.

## F-03: Tree binding will not cause unacceptable approval churn - 2026-10-20

We assume re-approval after an unrelated commit is rare enough in a feature branch. If not, narrow the hash to the feature's diff scope. This needs real use, not intuition.
