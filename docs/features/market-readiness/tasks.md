# Tasks: Market readiness

One task at a time. Each task names its requirement, the seam a test attaches to, and its `after:` edges. A task is done only when its acceptance line has recorded evidence.

## Phase 0 - Ship

- [x] T1 [R:Deploy the site] Pin Node 22 in the Pages build and prove a green deploy from a branch · seam: `.github/workflows/deploy.yml` · after: none · done 2026-10-21: the push ran `deploy site` green for the first time since 2026-10-15, and the live homepage now carries the October 2026 harness names. Recorded as the `deploy` evidence run
- [ ] T2 [R:Publish a release] Add `id-token: write`, configure npm trusted publishing, publish with `--provenance` under the `next` tag · seam: `.github/workflows/publish.yml` · after: none · done when: a prerelease is installable and shows provenance · **workflow fixed 2026-10-21 into two jobs after the first push proved a step-level `if` cannot read `secrets`; still needs the npm trusted-publisher setting and a tag push**
- [ ] T3 [R:Publish a release] Re-tag HEAD as `v0.2.1` and create the GitHub release from the successful publish run · seam: release process · after: T2 · done when: tag, release and npm version all point at the same commit
- [ ] T4 [R:Deploy the site] Verify the live pages contain the released commit's content · seam: Pages URL · after: T1, T3 · done when: the final security-verification content is visible publicly · **HEAD's content is verified live (harness names, rendered plan skill with the checklists); T3 has not run, so this waits on the release**
- [x] T5 [R:Keep public claims checkable] Replace "competitors only advise" copy and add the October 2026 competitor facts · seam: `README.md`, `PRODUCT.md`, `docs/COMPETITORS.md` · after: none · done 2026-10-21: PRODUCT states the narrower true claim, README command list and harness list updated, conventions updated, COMPETITORS §10 and RESEARCH §12 carry the dated facts. The site's own copy is the remaining surface (T21)

## Phase 1 - Re-earn the moat

- [x] T6 [R:Bind approvals to the tree] Write `head`, `tree` and `git` into every new approval entry · seam: approval parser/writer in `engine.js` · after: none · done 2026-10-21: `approve` records all three, or `git: unavailable` with no repository, and the chain hash covers them
- [x] T7 [R:Bind approvals to the tree] Fail a gate when the tree moved outside `evidence/`, and pass when only evidence changed · seam: gate evaluation · after: T6 · done 2026-10-21: 2 engine cases + a real-repository integration case (76/76). Drift is content-based against the signed tree, and process artifacts (features dir, installed harness dirs) are excluded by the same predicate the source fingerprint uses
- [x] T8 [R:Bind approvals to the tree] Show the signed commit and stale reason in `aisdlc report` · seam: `report` · after: T7 · done 2026-10-21: `bound tree|artifact-only|mixed`, drifted count and the offending files; `report` exits 3 on drift
- [x] T9 [R:Report enforcement honestly] Implement `doctor --json` with an enforcement level and install command per harness · seam: `harness-probe.js` · after: none · done 2026-10-21 in `harnesses.js#enforcement()`: native only when a guard file exists in the project, ci only when the gate workflow exists, else none, each with a reason
- [ ] T10 [R:Gate a pull request in CI] Add the reusable gate workflow, exit non-zero on failed or stale gates, upload SARIF when findings exist · seam: `.github/workflows/gates.yml` · after: T9 · **gate evaluation done 2026-10-21 as `aisdlc ci` (crossed gates plus any signed gate, spec validity, stale evidence, tree drift) and the workflow ships; `aisdlc export --format sarif` now exists (T17), so only the SARIF upload step remains**
- [ ] T11 [R:Report enforcement honestly] Add a native adapter only for harnesses whose hook API is verified; leave the rest `ci` · seam: harness adapter · after: T9 · done when: the adapter has a test and an honest fallback · **still blocked: no blocking-hook contract could be confirmed for Codex, Copilot, Cursor, Antigravity or OpenCode; Codex documents lifecycle hooks only for manually installed desktop plugins**

## Phase 2 - Distribution and interop

- [x] T12 [R:Support current harness names] Add `antigravity` and `devin` targets; keep `gemini-cli` and `windsurf` as warned aliases · seam: `harnesses.js` · after: none · done 2026-10-21: both targets install, both retired names still install into their compatible layout and print the retirement notice; `.devin/skills` joins the companion search roots
- [ ] T13 [R:Package for every marketplace] Add the portable root manifest, Codex/Copilot marketplace files and the package `skills` entry · seam: manifests · after: none · done when: each manifest validates and the skills CLI installs all 20 · **paths confirmed (`.agents/plugins/marketplace.json`, `.github/plugin/marketplace.json`, package `skills` array), enum spellings only medium-confidence and `$schema` is required by Agent Plugins 1.0; not shipped until a real install validates them**
- [x] T14 [R:Expose read-only state over MCP] Implement `mcp --stdio` with `next` and `status`, no writes · seam: `mcp.js` · after: T9 · done 2026-10-21: JSON-RPC 2.0 over stdio, `initialize`/`tools/list`/`tools/call`, write-shaped tool names refused with the CLI command to run instead; 4 tests including a spawned stdio session
- [ ] T15 [R:Package for every marketplace] Publish the skills listing and run an external security scan on the corpus · seam: listing + CI scan · after: T3, T13 · not started

## Phase 3 - Exportable evidence

- [x] T16 [R:Export portable evidence] Build the in-toto Statement v1 and DSSE envelope from a feature snapshot · seam: `export.js` · after: none · done 2026-10-21: `_type`/`predicateType` exact, subjects carry sha256 digests of every artifact and evidence record, predicate carries gates, approvals, evidence, git binding and the limits the bundle cannot cross
- [x] T17 [R:Export portable evidence] Build the SARIF 2.1.0 export for findings and failed gates · seam: `export.js` · after: none · done 2026-10-21: one run, a rule per failing gate plus acceptance, results only for failures and unsatisfied rows, feature-relative artifact URIs
- [x] T18 [R:Export portable evidence] Add `aisdlc export` and an offline verifier with tamper tests · seam: CLI command · after: T16, T17 · done 2026-10-21: self-contained bundle (statement, envelope, artifact and evidence copies, SARIF, verify.md); `export --verify` recomputes every digest offline, exits 1 naming the mismatched file, and catches a rewritten statement, a hidden file and an invented one
- [x] T19 [R:Export portable evidence] Add the optional external signer adapter (`ssh-keygen -Y sign` or `cosign`) · seam: `provenance.js` · after: T18 · done 2026-10-21 as `export --sign "<cmd {envelope}>"`: runs the signer over the envelope without a shell, degrades with a printed reason when it fails, and the verifier then reports the signature count and says the bundle carries no public key. No signer is bundled and none is required

## Phase 4 - Credibility

- [ ] T20 [R:Publish evals] Build the seeded fake-green eval suite and publish gated vs ungated results · seam: eval runner · after: T18 · not started
- [ ] T21 [R:Keep public claims checkable] Write the launch post and the positioning page around cross-vendor process evidence · seam: docs/site · after: T3, T5, T20 · not started

## Blocked or deferred

- None. T11 stays closed as `ci` until a harness documents a hook that can block a tool call; the research pass found none for Codex, Copilot, Cursor, Antigravity or OpenCode.
