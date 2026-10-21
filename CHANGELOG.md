# Changelog

All notable changes to arsdlc are documented here. Format follows [Keep a Changelog](https://keepachangelog.com); versioning follows [SemVer](https://semver.org).

## [Unreleased]

### Repository hygiene
- `SECURITY.md`, `CODE_OF_CONDUCT.md`, `.github/ISSUE_TEMPLATE/{bug_report,feature_request,config}`,
  `.github/PULL_REQUEST_TEMPLATE.md` and `.github/dependabot.yml` (actions weekly, site deps monthly).
  Measured reason, not decoration: GitHub's own community profile for this repo reported **57%** and named
  issue templates, PR templates and a code of conduct as the missing files, and the npm Insights
  maintenance component reads the same absences. After this commit landed, the same endpoint reported
  **100%** - which is the only part of the 88 that files could reach. Dependabot ran its first check within
  seconds of the config landing; security alerts were off and are now on (`GET /vulnerability-alerts` → 204).
- `SECURITY.md` states the threat model rather than the usual disclaimer: zero runtime dependencies, no
  network, no install-time scripts, and then the limits the README already admits - local writers can
  recompute hashes, `Approved-by` is not identity, `AISDLC_AGENT` is a tripwire, the guard is heuristic and
  Claude-only, the scanner is pattern-based. Tree-write access is explicitly out of scope.
- The bug template asks for `--version`, `arsdlc doctor`, `next --json` and the evidence JSON, because a
  report about a process kit is only useful if it can be reproduced from files instead of a chat log.
- Repo description still read "aisdlc runs the process" after the rename; the About field is now `arsdlc`.

## [0.3.1] - 2026-10-21

### Package presentation
- Every install string in the repo is now `npx arsdlc …` (205 occurrences across skills, the three slash commands, the CI gates workflow, the CLI's own help and templates, both READMEs). The scoped fallback is gone: the unscoped name is live and `@anshroshan/arsdlc` was never published.
- `packages/cli/package.json` gained the metadata npm renders and we were missing: `author`, `bugs.url`, a `changelog` link, a `homepage` that points at the GitHub Pages site instead of the repo README anchor, and keywords covering attestation, in-toto, SARIF, segregation-of-duties and OpenCode. The description is one line a person can read in a search result rather than a paragraph that gets truncated mid-sentence.
- The package README opens with npm version, download, Node and licence badges and closes with the site and issue links; it is what a stranger sees on the registry page. New **Verifying what you installed** section: zero runtime dependencies, no install-time hooks, and a tested loop that blob-compares all 38 tarball files against the public `gitHead` commit - the check that stands in for the build attestation 0.3.0 does not have. Run against the live tarball on 2026-10-21: 38 files, no mismatches.
- **Provenance, stated plainly instead of implied:** the README now tells you to run `npm audit signatures` and what a blank result means - a laptop publish, no OIDC identity, compare `--version` against the tag. `publish cli` on the `v0.3.1` tag got as far as writing a **signed provenance statement for `arsdlc@0.3.1` to the Sigstore transparency log** (logIndex 3353477021) and only then hit npm's `E404`, because no trusted publisher is registered for the name. A failed CI publish is therefore not fully clean: an attestation for a version that does not exist on the registry is now public. Worth knowing before the retry.

### Corrections to this file
- 0.2.1 claimed to be the "first published release", shipping to npm as `aisdlc-cli` with provenance. It never went out: `aisdlc-cli`, `aisdlc` and `@anshroshan/aisdlc` are all 404 on the registry as of today, and the publish attempts failed on `ENEEDAUTH` and then on the name-similarity rule. `arsdlc@0.3.0` is the first live package. A changelog that claims a publication which did not happen is exactly the fake green this project exists to catch, so the entry is fixed rather than footnoted.
- The `@anshroshan/arsdlc` fallback note under 0.3.0 is marked superseded - the thing it hedged against did not happen.

## [0.3.0] - 2026-10-21

### Renamed to arsdlc
- The project is **`arsdlc`**: AR (Ansh Roshan) + SDLC, free on npm, PyPI and GitHub, and owned by nobody in search. It replaces `aisdlc`, which npm refused at publish time with `403 Package name too similar to existing package ai-sdlc` - a live package, 138 versions, same category. Two lessons recorded where they will be read: **a registry 404 means unclaimed, not claimable**, and a name one hyphen from a neighbour in your own category is a discovery problem even when the registry lets you take it.
- This rename is at identifier level, not prose: 873 occurrences across 102 files, 20 skill folders, two agent definitions, three slash commands, the guard module, the CLI bin, the project marker `arsdlc.json`, the `arsdlc:allow-secret` marker the engine parses, the `npx arsdlc <verb>` pattern that rule 5 uses to prove documented commands exist, and the plugin and marketplace manifests.
- History keeps the old name where it is true. `docs/RESEARCH.md`, `docs/AUDIT.md` and `docs/COMPETITORS.md` still say `aisdlc` in prose because they record what the project was called when written. Their markdown **link targets** were rewritten: a link to a file that no longer exists is a defect, not a historical record, and the corpus checker found 30 of them and was right to fail.
- ~~If npm refuses `arsdlc` the way it refused `aisdlc` the fallback is `@anshroshan/arsdlc`.~~ Superseded by 0.3.1: the unscoped name took. npm did put the first publish in a staged-release review (`0.0.0-stage` sitting under `latest`), which cleared the same day; the scoped fallback was never published and every string in the repo went back to `arsdlc`.
- Provenance cannot come from a laptop: `npm publish --provenance` fails with `Automatic provenance generation not supported for provider: null`. It needs the CI identity `publish cli` already requests via `id-token: write`, so the first publish is unsigned and provenance follows from the next version.
- `v0.2.1` and the first `v0.3.0` were tagged and never published. They are left as superseded history rather than quietly rewritten, because an unpublishable name is a fact worth keeping.

## [0.2.1] - 2026-10-21

Not the first published release after all - corrected in 0.3.1. This was written while the publish was
still expected to land; `aisdlc-cli` never reached the registry and `arsdlc@0.3.0` is the first live
package. What 0.2.1 is: the release where the process it
enforces now holds at the action rather than the artifact: approvals bind the commit and tree a human
signed, `aisdlc ci` plus a reusable workflow gate the pull request, and `aisdlc export` produces an
in-toto/DSSE bundle with SARIF that verifies offline. Honest limits, stated in the docs and not in
footnote: the guard is Claude Code only, no other harness has a confirmed blocking hook, hash chains
are not authenticated identity, and the eval numbers in T20 have not been run.

G1 and G5 on the `market-readiness` program are unsigned. This release ships on the maintainer's
explicit instruction; the override is recorded as F-07 in `context/decisions.md` rather than being
filed under a gate that did not happen.

### Exportable evidence and a read-only MCP surface
- New command `aisdlc export <feature> [--out dir] [--format all|statement|sarif] [--sign "<cmd {envelope}>"]`: writes a self-contained bundle - in-toto Statement v1, DSSE envelope, copies of every artifact and evidence record, SARIF 2.1.0 and a `verify.md`. The statement's subjects carry sha256 digests of the shipped files; the predicate carries gate verdicts, approvals with their tree bindings, evidence runs, the source fingerprint and the limits the bundle cannot cross.
- `aisdlc export --verify <dir>` recomputes every digest offline and exits 1 naming the mismatched file. It catches an edited artifact or record, a file dropped from the bundle, a file added to it, and a statement rewritten without the envelope. Nothing contacts a registry or a service.
- Signing is an external adapter, not a dependency: `--sign "ssh-keygen -Y sign -n aisdlc -f key.pem {envelope}"` runs without a shell, and a failing signer degrades to an unsigned bundle that says so. The verifier reports signature counts and states that the bundle carries no public key.
- SARIF maps failing gate checks to `aisdlc/<gate>` rules and unsatisfied acceptance rows to `aisdlc/acceptance`, so code scanning can ingest the verdicts.
- New command `aisdlc mcp --stdio`: JSON-RPC 2.0 over stdio exposing `aisdlc_next` and `aisdlc_status` only. A tool name shaped like a write (`approve`, `evidence`, `gate`) is refused with the CLI command the human should run; the server never writes. `next --json` and the MCP response now share one builder, so they cannot drift.
- Docs updated: README lists `ci`, `export` and `mcp` and the current harness names (Antigravity CLI, Devin Desktop, with the retired layouts flagged); the npm README describes the tree binding and export; PRODUCT states the narrower, true position instead of "enforcement, not templates".

### Commit-bound approvals, CI enforcement, honest harness reporting
- Approvals now record `head`, `tree` and `git` at signing time. G1, G4 and G5 fail when content moved after the signature - the gap Spec Kitty's `LANE_MOVED_AFTER_APPROVAL` and AI-DLC's plan fingerprint both close - naming the files and the re-approval action. A project with no git records `git: unavailable` and keeps artifact-hash behavior; nothing is claimed that cannot be checked.
- Drift excludes what the process itself moves: the feature's artifacts and installed harness directories, filtered by the same predicate the source fingerprint uses (`isProcessArtifact`). What remains is exactly what a hash cannot see: the code changed after a human signed.
- New command `aisdlc ci [feature] [--json]`: validates every spec, then fails on any lane-required gate the flow has crossed or a human has already signed, on stale evidence, on artifact-hash staleness and on tree drift. `.github/workflows/gates.yml` runs it, reusable from any repo, so harnesses with no native hook still get a merge check.
- `doctor` now prints an enforcement level per harness (`native`, `ci` or `none`) with the reason and the install command, and `doctor --json` emits it for tooling. `native` requires a guard module the project can point at; a harness's advertised capability is never reported as this project's protection.
- Harness registry gained `antigravity` and `devin`; `gemini-cli` and `windsurf` still install into their compatible layouts and now print the retirement notice. `.devin/skills` joined the companion search roots.
- `deploy site` pins Node 22 (Astro 7 refuses 20; the Pages deploy had been failing since 2026-10-15) and is green on this commit. `publish cli` prefers npm trusted publishing over OIDC with `--provenance` and falls back to `NPM_TOKEN` when that secret exists. Two rules cost a failed push each to learn: GitHub does not expose `secrets` in a job-level or step-level `if`, so the switch is a step output; and an inline assignment of the secret into `NODE_AUTH_TOKEN` inside the run script is an assigned secret literal that `aisdlc scan` rejects, so the token arrives via `env:` on its own step. The kit caught its own broken workflow.
- Tests 72 to 78: engine drift cases, a real-repository integration case, the no-git binding, and the enforcement matrix.

### Installer link mode
- `aisdlc init --link` now creates real symlinks on Windows and falls back to a junction only when the system refuses the privilege (`EPERM`/`EINVAL`). Developer Mode installs produce the same link shape as POSIX; machines without it keep working.
- The install summary prints the shape it actually used, so a junction is never reported as a symlink. Git sees junctions as ordinary directories, which is why the real link matters.
- `copyOrLink` returns the mode it used and takes an injected `platform`/`symlink`, so both branches are tested without changing account privileges. Test: `packages/cli/test/edgecases.test.js`.

### System design coverage
- Added 111 numbered system-design and operations checks as two plan branches: `skills/aisdlc-plan/references/system-design-checklist.md` (79 items: entry path, data access, concurrency and consistency, scaling, resilience, async, security, schema change, runtime resources, performance and cost) and `references/operations-checklist.md` (32 items: delivery, platform, operations). Each item states the answer the plan owes and the plan section that carries it; `n/a: <reason>` is legal, silence is not.
- `aisdlc-plan` step 2 names the trigger for each branch, and `aisdlc-review` Axis 2 files an unanswered item on a touched surface as a blocking finding. The traps live with their items: scans versus seeks, pick two in CAP, poison messages, Bobby Tables, a stolen token that stays valid, it is always DNS, YAML indentation, test on 1%, bill shock, follow the request id, the 3:14 AM page, and velocity measured against change-failure rate.
- Split into two files because all 111 in one is 9,711 B, over the 9 KB sub-file budget. Each branch now pays only its own half, recorded as new hot paths: `plan + design checklist` 17,898 B / 20 KB and `plan + operations checklist` 14,126 B / 16 KB.

### Final security verification
- Added a 21-control security review protocol to verification, review, quality and release handoffs, covering injection/XSS/CSRF/SSRF, uploads, authorization/BOLA/RLS, tokens/secrets, passwords/MFA/cookies/storage, rate limits, webhooks, source maps, credentials/logging and dependency audits.
- Require evidence-backed applicability, recorded negative tests, safe fixes/retests, current OWASP and relevant official provider/cloud guidance, and an explicit final security summary. Static-only surfaces can be NOT_APPLICABLE; missing proof is NOT_VERIFIED, never a pass. This is a skill workflow requirement, not a new automatic CLI gate.
- Seeded acceptance reviewer notes with security-review provenance and unverified readiness; added regression checks for all controls, routing, reporting and context budgets.

### Review hardening
- Reviewed all 85 original project-owned files, including all 20 skills, demo artifacts, research history, SVGs and the complete site lockfile. Added a file-by-file audit and validation report.
- Expanded tests from 29 CLI tests to 66 CLI tests plus 12 guard and 6 site regressions, covering every CLI command, all harness installs, gates, corruption, source freshness, Windows argv, junction aliases and legacy history recovery.
- Approvals now count distinct normalized identities, reject author self-approval even with `--force`, enforce regulated G4 counts, and bind spec intent into G1/G4/G5 hashes. Existing approvals need human re-review; chains are not silently migrated.
- Acceptance requires every spec scenario and real green, current-source evidence for every row; technical blockers stay agent-owned. Model families group Claude aliases together and OpenAI GPT/o-series together. Blank fields and placeholder waivers no longer borrow later lines or earn a pass.
- Evidence records exact requested/executed argv, checksum and source fingerprints including uncommitted changes, Markdown and deletions. Legacy records cannot prove a gate but do not poison a new valid run. Corruption fails gate/audit; recognized secret output is redacted and common credential flags rejected.
- CLI JSON failures/staleness use nonzero exits; skipped gates do not fail lane completion. Malformed config is rejected before installer writes. Unsafe slug/label/task paths fail before commands run. Windows package-manager argv is no longer shell-concatenated.
- Installer protects physical aliases, handles cross-drive copies, preserves extra user files and uses Windows junctions for link mode. No-Git source walks no longer silently omit deep files. Guardrail seeds require actual measured budgets.
- Fixed invalid plugin JSON, the actual mods API `exitCode` contract, repeated CLI command caching, target-file signature checks, Edit/MultiEdit handling, compound evidence exemptions and fail-open UI behavior. Agreed signed-spec deltas now explicitly require human unlock.
- Upgraded Astro from5.18.2 to7.3.8 after npm audit identified critical/high advisories; transitive dependencies are patched and re-audited. CLI remains dependency-free.
- Fixed site metadata, Markdown/code fidelity, duplicate anchors, clipboard error feedback and mobile navigation. CI runs guard/site regressions; release permissions/action usage and deploy concurrency were corrected. SVG diagrams now place every gate on its actual transition.
- Documented the trust boundary: names/checksums are not authenticated identities, guard interception is heuristic, detectors are incomplete and recorded commands/addons may access the network.

### Added
- **Site: the 20 skill pages now render their `SKILL.md`.** They previously showed the frontmatter description and nothing else, so 20 of the site's 23 pages were near-empty. The body is rendered at build time with a section outline, and placeholders like `<slug>` are neutralised at the markdown renderer rather than by pre-escaping the source (pre-escaping made marked escape the ampersand twice and printed `&lt;slug&gt;` on the page).
- **`assets` / site: `og.png`** plus `og:image`, `twitter:card` and canonical tags, captured from the redesigned hero so the social card cannot drift from the site. The hero and flow diagrams were recolored from the retired lime-on-green-black palette to the site's slate ink and single accent.
- **`aisdlc report [feature] [--json]`**: the logs stop being write-only. The kit records every run and every approval and had never read them back, so `aisdlc-retro` was eyeballing a directory listing. Now the engine computes it: recorded runs and pass rate, time on disk, whether the last full run predates the last code change (git-derived, optional, never guessed), approvals that went stale because the artifact was edited after signing, how the review scored (independent / declared degraded / same family / unrecorded), open tasks, deltas raised vs. decided, and the slowest gate-to-gate gap. Exits non-zero when evidence or an approval is stale. `report` with no argument summarizes every feature. New `/aisdlc-report` command; `aisdlc-flow` routes health and trend questions to it and `aisdlc-retro` starts from its numbers.
- **`hooks/aisdlc-guard.mjs`**, a Claude Code mod: enforcement moves from the artifact to the action. It holds a bare test runner while a feature is open and prints the `aisdlc evidence …` form that would count, refuses `aisdlc approve` before the call rather than after, blocks edits to a signed `spec.md` and hand-written `Approved-by:` lines, and refuses writes to `evidence/` and `approvals.json`. It reads `aisdlc next` once per turn, puts the real state in the model's context and the user's status line, and fails open whenever it cannot decide. Ships with the plugin install; the other six harnesses keep the portable contract unchanged. `check-skills.mjs` rule 10 checks the mod against the documented API (`register(on)`, literal `$.noun.method(...)` calls, known event and namespace names, a byte budget).
- **`packages/cli/scripts/check-skills.mjs`**: the corpus is now a tested artifact, not prose someone re-read. Checks every skill's frontmatter (uniform fields, `name` equals the folder, description length), that every `aisdlc-*` token names a real skill, slash command or subagent, that every command documented in a skill, doc, page or README exists in `cli.js`, that every `references/` file a skill promises is on disk, that relative links resolve, plus portability lint (no harness-specific model alias in spawn prose, no naming one client's subagent tool, no POSIX-only shell glue) and byte budgets per file **and per hot path** - what a run actually loads. Runs in CI as the `corpus` job.
- **Cross-model review enforcement (G4)**: `acceptance.md` records `Author model:` and `Reviewer model:`, and the gate fails when both name the same model family, fails when either is missing or still a template placeholder, and passes a declared `Cross-model: degraded (why)` while printing that it is not the guarantee. `aisdlc-review` gained the detection ladder (settings files and env, never self-introspection, because `/model` switching makes a model's own answer stale), the one recommended confirm question, and the contrast table.
- **Value sourcing (spec §9, checked at G2)**: the spec must list every value the feature produces, computes or displays with a named source, or say `n/a: <why>`. This replaces "do I feel like I'm inventing something" - which the build model always rationalises - with an enumeration the gate can fail.
- **Evidence-citation check (G4)**: a row in `acceptance.md` that names an evidence file must name one the CLI actually recorded, so prose cannot borrow a filename.
- **Test policy, three states** (`aisdlc.json` → `test.gate`): `configured` (default), `none-by-design` (full suite waived, the waiver printed, a recorded run still required), `none-yet` (no escape hatch). `aisdlc doctor` shows which is in force.
- **`agents/aisdlc-scout.md` and `agents/aisdlc-researcher.md`**: read-only subagent definitions installed by `init` for Claude Code, with the cheap model pinned in the definition rather than in prose, so skill text stays harness-neutral. `aisdlc-implement` and `aisdlc-plan` route their reading through them and keep the writing on the main thread.
- **`aisdlc kinds`**: prints each kind's verify model and each lane's gate set, replacing a reference to a command that did not exist.
- `docs/conventions.md`: the authoring constitution - what earns a line, when a file is worth splitting, the budgets and why a warning means prune, the portability rules, and the rule that a check that can be satisfied by cleverer prose is not a check.
- Progressive disclosure for the two rarest long branches: `aisdlc-flow/references/manual-derivation.md` (deriving state with no CLI) and `aisdlc-review/references/pushback-and-exit.md`. Every router's cost dropped; the branch costs what it takes.

### Fixed
- README advertised `aisdlc verify`, a command that was never implemented, and the commit that claimed to remove it had only edited the reference table. The corpus checker now makes that class of claim unfalsifiable-by-omission.
- Badges pointed at the `aisdlc` npm slug (404) instead of `aisdlc-cli`; the npm and GitHub Pages install paths are now labelled honestly as not-live-yet rather than presented as working installs.
- `aisdlc scan` flagged the kit's own test fixture, so the tool could not pass its own G3; the fixture now carries the `aisdlc:allow-secret` marker and CI runs `scan` on every push.
- CONTRIBUTING and `aisdlc-flow` referenced an `aisdlc/` directory that no command creates.
- Reviewer-notes placeholders in the seeded `acceptance.md` satisfied the cross-model check; a filled line under an untouched template line now wins.

### Added
- `aisdlc check delta <path|feature>`: machine-validates a delta file — Change table types (`modify`/`add`/`remove`/`rename`), Reason + Migration on removals, FROM/TO + Reason on renames, full-text `modify` rows, non-empty change, required sections (`Trigger`/`Change`/`Impact`/`Decision`). Engine `validateDelta`, covered by tests; `aisdlc-delta` runs it alongside its two-directional read.
- Skills depth pass against six competing process kits (research: `docs/COMPETITORS.md`, `docs/RESEARCH.md` §8–§9): constitution check, data model, interface contracts, research table and smoke path in the plan; read-only consistency pass with PASS/CONCERNS/FAIL readiness in tasks; waves, subagent delegation contract, worktree setup and baseline-commit evidence in implement; three review lenses, pushback handling and branch exit decision in review; discovery verdicts (build / spike first / defer / do not build) with optional PR-FAQ; spec §8 UX & interaction; delta `rename` type; constitution amendment procedure and skill-edit hygiene in retro; refusal lists in taste, quality, brownfield, release; re-plan path in plan + flow.
- `test/templates.test.js`: locks the seeds to the skills (constitution header, spec §8, plan's 14 sections, acceptance triage, G5/G6 seed behaviour, always-on steering line).

### Changed
- Seeds now match the skill contracts: constitution carries `Version`/`Amended`, spec carries §8, plan carries the full contract, acceptance carries finding triage and reviewer notes, and the `init` instruction block tells every session to read taste + glossary + constitution before writing code.
- Version aligned to 0.2.0 everywhere (`package.json` was 0.1.0, `cli.js` was 0.2.0, Claude plugin manifests were 0.1.0).
- Doc consistency sweep: root README CLI reference now lists `aisdlc evidence` and `aisdlc gate` (there is no `aisdlc verify` command), the npm README says twenty skills and lists Craft and Quality, `aisdlc-quality` points at `aisdlc gate G3`/`aisdlc evidence`, and `COMPETITORS.md` marks its gap lists as research-time snapshots resolved by RESEARCH §9.
- Two new companion bridges from [ansh-other-skills](https://github.com/AnshRoshan/ansh-other-skills): `aisdlc-craft` (line-level clean-code craft during BUILD, bridged to code-craft) and `aisdlc-quality` (lint/dead-code/complexity/security CLI runner feeding VERIFY and review, bridged to code-quality-tools). Both use the official skills when installed and embedded distillations otherwise. Skill count: 18 to 20; `aisdlc addon code-craft|quality-tools|all` installs them.
- Claude Code plugin support: `/plugin marketplace add AnshRoshan/aisdlc` then `/plugin install aisdlc@aisdlc` installs the 20 skills plus `/aisdlc-next` and `/aisdlc-status` commands (`.claude-plugin/`, `commands/`).
- `publish cli` workflow: tag `vX.Y.Z` (or run manually) to publish the CLI to npm as `aisdlc-cli`; requires the `NPM_TOKEN` repository secret.

- Rewrote the README as a proper front page: install matrix (npx, Claude Code plugin, skills.sh, manual), mermaid gate flow, lanes, gates, invariants, skill index.
- Repository homepage now points at the live GitHub Pages site.
- Rebuilt the repository from scratch with clean history.
- Replaced the Next.js website (and the dead SaaS application left inside it) with a static Astro site deployed to GitHub Pages.

## [0.1.0] - 2026

### Added
- 18 Agent Skills covering the full process: flow (router), brainstorm, discover, brownfield, taste, spec, plan, tasks, implement, debug, verify, review, release, retro, plus the cross-cutting grill, ponytail, delta, handoff.
- Zero-dependency CLI (`npx aisdlc-cli`): harness installation, feature scaffolding with lanes (`spike`/`quick`/`standard`/`regulated`), EARS spec validation, gates G1–G6, hash-bound approvals, evidence recording, secrets scan.
