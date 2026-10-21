# Spec: Market readiness

## 1. Context

Kind: **lib**. Lane: **standard** (new capability; all six gates). Verify model: API contract tests + semver + back-compat.
Problem: arsdlc is synced but unshipped (npm 404, no release, broken Pages deploy, no audience), and the October 2026 market now has deterministic enforcement from AWS AI-DLC and Spec Kitty, so the "competitors only advise" claim is false. Approvals bind artifact text but not commits, the guard is Claude-only, and evidence cannot be consumed by CI or audit tooling.
Users: the maintainer shipping the kit; contributors changing the corpus; developers adopting it; reviewers and auditors who must verify a claim without trusting the author.

## 2. Goals / Non-goals

- Goal: make the kit externally installable, with a reproducible release and a current site.
- Goal: bind approvals to commits and trees so a post-approval change is visible and fails closed.
- Goal: report the real enforcement level per harness and provide a CI gate for harnesses without native hooks.
- Goal: export evidence as in-toto/DSSE and findings as SARIF, verifiable offline.
- Goal: replace stale competitive claims with measured ones and publish evals.
- Non-goal: hosted SaaS, accounts, SSO, billing or telemetry.
- Non-goal: replacing a harness's native plan mode, sandbox or permission system.
- Non-goal: a rename, a 21st skill, or a new gate without merging or deleting one.
- Non-goal: cryptographic identity guarantees. Signing is optional and external; the core stays hash-chained.

## 3. Requirements (EARS)

### Requirement: Publish a release

WHEN a `v*` tag is pushed and the CLI suite passes THE SYSTEM SHALL publish `arsdlc` to the npm registry with provenance and create a GitHub release pointing at the tagged commit.

#### Scenario: Publish succeeds
- GIVEN trusted publishing is configured and the test suite passes
- WHEN a `v*` tag is pushed
- THEN the registry serves that exact version, the release points at the tagged commit, and the package page shows provenance

#### Scenario: Credentials are missing
- GIVEN no trusted publisher and no token
- WHEN a release is attempted
- THEN the workflow exits non-zero before any publish, prints the exact configuration remedy, and creates no release

#### Scenario: Tests fail
- GIVEN the CLI suite has a failing test
- WHEN a release is attempted
- THEN nothing is published and no release or tag is moved

### Requirement: Deploy the site

WHEN a commit lands on `main` THE SYSTEM SHALL build the site with a Node version supported by Astro 7 and deploy the artifact, and a failed build SHALL leave the previous deployment live.

#### Scenario: Deploy succeeds on HEAD
- GIVEN the site builds locally
- WHEN the commit is pushed to `main`
- THEN the deploy job is green and the live pages contain that commit's content

#### Scenario: Build fails
- GIVEN an unsupported Node version or a broken build
- WHEN the deploy runs
- THEN the job fails loudly and the previously deployed site remains reachable

### Requirement: Bind approvals to the tree

WHEN a human signs G1, G4 or G5 THE SYSTEM SHALL record the current `head` commit and `tree` hash in the approval entry, and WHEN a gate is evaluated and the tree differs from the signed tree outside the feature's evidence directory THE SYSTEM SHALL fail the gate as stale and name the re-approval action.

#### Scenario: Tree unchanged
- GIVEN an approval signed on the current tree
- WHEN the gate is evaluated
- THEN it uses the approval and reports the signed commit

#### Scenario: Code changed after approval
- GIVEN a G4 approval signed at commit A
- WHEN a content commit lands before merge
- THEN the gate fails as stale, names commit A and the files that moved, and prints the re-approval command

#### Scenario: Evidence added after approval
- GIVEN an approval signed on the current tree
- WHEN only files under the feature's evidence directory change
- THEN the approval remains valid and the evidence is still required for the gate

#### Scenario: No git repository
- GIVEN a project without git
- WHEN an approval is recorded
- THEN the entry records `git: unavailable` and the gate prints the degraded message instead of claiming tree binding

### Requirement: Report enforcement honestly

WHEN `arsdlc doctor --json` runs THE SYSTEM SHALL report every supported harness with an enforcement level of `native`, `ci` or `none` and the exact install command, and SHALL NOT report `native` unless a guard module is installed and its manifest validates.

#### Scenario: Claude Code with the guard
- GIVEN the plugin and guard are installed and validated
- WHEN doctor runs
- THEN Claude Code reports `native` and names the guarded events

#### Scenario: A harness without a native guard
- GIVEN Codex is installed without a lifecycle adapter
- WHEN doctor runs
- THEN Codex reports `ci` or `none`, never `native`, and prints the CI gate command

### Requirement: Gate a pull request in CI

WHEN the reusable gate workflow runs on a pull request THE SYSTEM SHALL evaluate G2 through G4 from repository files, exit non-zero on a failed or stale gate, and upload the verdict as SARIF when findings exist.

#### Scenario: Gates pass
- GIVEN a feature with current evidence and approvals
- WHEN the workflow runs
- THEN it exits zero and publishes a passing check

#### Scenario: Gates fail
- GIVEN a stale approval or missing evidence
- WHEN the workflow runs
- THEN it exits non-zero and the check blocks the merge when branch protection requires it

### Requirement: Export portable evidence

WHEN `arsdlc export <feature> --format all --out <dir>` runs THE SYSTEM SHALL write an in-toto Statement v1, a DSSE envelope, a SARIF 2.1.0 file when findings exist, and a verifier note containing the exact offline verification command.

#### Scenario: Export succeeds
- GIVEN a feature with recorded evidence and at least one approval
- WHEN export runs
- THEN the statement lists the feature, approvals, evidence checksums and gate verdicts, and the envelope wraps the statement

#### Scenario: Export is tampered with
- GIVEN an exported statement whose evidence checksum was edited
- WHEN the verifier runs
- THEN it exits non-zero and names the mismatched record

#### Scenario: Export is unsigned
- GIVEN no signing key or external signer
- WHEN export runs
- THEN the output states that integrity is proven against later tampering, not authorship

### Requirement: Expose read-only state over MCP

WHEN `arsdlc mcp --stdio` receives a `tools/list` request THE SYSTEM SHALL return read-only `next` and `status` tools, and a tool call SHALL NOT write files, record evidence or approve.

#### Scenario: List tools
- GIVEN a configured project
- WHEN the client requests the tool list
- THEN `next` and `status` are returned with schemas

#### Scenario: State request
- GIVEN an open feature
- WHEN the client calls `next`
- THEN it returns the same state, blockers and skill name as `arsdlc next --json`

#### Scenario: Write attempt
- GIVEN a client tries an unsupported write action
- WHEN it calls the server
- THEN the server rejects the request and points at the CLI command that requires a human

### Requirement: Support current harness names

WHEN `arsdlc init --harness antigravity` or `--harness devin` runs THE SYSTEM SHALL install into that harness's current layout, and WHEN a retired name is used THE SYSTEM SHALL install into the legacy-compatible path and print a deprecation warning.

#### Scenario: Antigravity install
- GIVEN Antigravity CLI is the active harness
- WHEN init runs
- THEN skills are written to the path Antigravity reads and doctor names the harness correctly

#### Scenario: Retired name
- GIVEN a user passes `gemini-cli`
- WHEN init runs
- THEN the install completes in the compatible path and prints that Gemini CLI was retired in favor of Antigravity

### Requirement: Package for every marketplace

WHEN a user installs through the skills CLI, the Codex or Copilot marketplace, or the Claude plugin THE SYSTEM SHALL expose the same 20 skills and a versioned manifest.

#### Scenario: Skills CLI install
- GIVEN a clean project
- WHEN `npx skills add AnshRoshan/arsdlc` runs
- THEN all 20 skills install and a lockfile pins the source

#### Scenario: Plugin validation
- GIVEN the repository root
- WHEN `claude plugin validate .` runs
- THEN it passes and the manifest version matches the package version

### Requirement: Keep public claims checkable

WHEN README, PRODUCT or the site states an enforcement claim THE SYSTEM SHALL cite the check or test that enforces it, and SHALL NOT claim that competitors only advise.

#### Scenario: Claim audit
- GIVEN the published documentation
- WHEN the corpus checker and a manual claim audit run
- THEN every enforcement sentence names a check, a test or a gate, and the stale competitor claim is absent

### Requirement: Publish evals

WHEN the eval suite runs THE SYSTEM SHALL execute seeded tasks with and without gates and publish the pass rate and the fake-green detection rate.

#### Scenario: Seeded fake green is caught
- GIVEN a task whose agent claims success without running the suite
- WHEN the gated run executes
- THEN the gate fails the claim and the published result records the detection

## 4. Constraints (non-functional, EARS)

- THE SYSTEM SHALL keep the CLI zero-dependency and run on Node 18 or newer.
- THE SYSTEM SHALL keep gate evaluation and export verification fully offline by default.
- THE SYSTEM SHALL keep Windows and POSIX behavior equivalent, with no shell-concatenated argv.
- THE SYSTEM SHALL never write secrets into evidence, exports or logs, and SHALL redact recognized credential output.
- auth: no network identity is required. Approvals are local identities plus optional external signatures; the system must not imply more.
- data: evidence records commands, paths and checksums. No PII is required; retention is the life of the repository.
- budget: CLI startup under 300 ms; export under 2 s for 100 evidence records; publish workflow under 5 minutes.

## 5. Acceptance bar

Approved-by: ______  Date: ______

## 6. Open questions

| # | Question | Owner | Status |
|---|---|---|---|
| 1 | Is npm trusted publishing available for this account, or is a scoped token required? | maintainer | open |
| 2 | Which harnesses expose stable lifecycle hooks for a native adapter in October 2026? | maintainer | open |
| 3 | Does whole-tree binding cause unacceptable re-approval churn, or should it narrow to the feature diff? | maintainer | open |
| 4 | Does phase 2 split into separate feature folders once tasks exceed five? | maintainer | open |
| 5 | Is the name collision with AWS AI-DLC acceptable without a rename? | maintainer | decided: keep the name (D-06) |

## 7. Seams (where tests attach)

- CLI command table: `next`, `evidence`, `approve`, `gate`, `report`, `doctor`, `export`, `mcp`.
- Pure engine functions: `artifactHashFor`, gate evaluators, approval parsing, evidence validation, export builder.
- Workflow files: `.github/workflows/publish.yml`, `deploy.yml`, `gate.yml`.
- Plugin manifests: `.claude-plugin/plugin.json`, portable root `plugin.json`, `.agents/plugins/marketplace.json`.
- Guard module: `hooks/arsdlc-guard.mjs` and its manifest.

## 8. UX & interaction (n/a: lib)

- n/a: lib is not a UI kind.

## 9. Value sourcing

Every value this feature produces, computes or displays, and where it comes from.

| Value | Source | How obtained |
|---|---|---|
| Gate verdict | Engine pure function over parsed artifacts | `gate` evaluation in `engine.js` |
| Approval freshness | Approval hash + recorded `head`/`tree` vs current files and git state | `artifactHashFor` plus `git rev-parse` / `git write-tree` |
| Evidence checksum | SHA-256 of the recorded run and source fingerprints | Evidence record written by `arsdlc evidence` |
| Harness enforcement level | Installed manifest probe plus `claude plugin validate` result | `doctor --json` probe |
| Export statement | Feature artifacts, approvals and evidence records | `arsdlc export` builder |
| Findings | `acceptance.md` findings table and gate failures | Parser in `engine.js` |
| Publish status | npm registry and GitHub release APIs | Workflow output, never invented locally |
| Eval pass rate | Eval runner results for gated and ungated runs | Eval suite output |
