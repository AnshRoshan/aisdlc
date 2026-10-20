# Plan: Market readiness

## Architecture

The CLI keeps its existing shape: `cli.js` parses commands and owns effects, `engine.js` stays pure over parsed state, `fsx.js` owns disk and platform behavior. Four new modules stay inside `packages/cli/src/` and use built-ins only: `provenance.js` resolves git `head`/`tree` and optional external signers, `export.js` builds the in-toto statement, DSSE envelope and SARIF, `mcp.js` serves a read-only stdio JSON-RPC loop, and `harness-probe.js` reports what is actually installed. Approvals gain three additive fields. Workflows gain a reusable gate job and move to Node 22. Packaging gains a portable root manifest and a `skills` entry. The guard stays where it is; harnesses without a native hook get the CI gate and an honest `doctor` level.

```
aisdlc CLI
  cli.js  ──> engine.js (pure gates, hashes, flow, report)
     │            ▲
     ├──> fsx.js ─┘
     ├──> provenance.js ──> git rev-parse / rev-parse HEAD^{tree} / optional signer
     ├──> export.js ──────> statement.json · envelope.json · findings.sarif · verify.md
     ├──> harness-probe.js ─> enforcement matrix for doctor
     └──> mcp.js ─────────> stdio JSON-RPC: next, status (read-only)

hooks/aisdlc-guard.mjs ──> cached `next --json` ──> blocks actions (Claude Code only)
.github/workflows/{ci,deploy,publish,gate}.yml ──> npm, Pages, PR checks
site/ ──> Astro 7 static build on Node 22
```

## Constitution check

| Principle (from docs/constitution.md) | Verdict | Evidence / justification |
|---|---|---|
| The spec is the source of truth | comply | No plan step edits the spec; intent changes go through a delta. |
| Gates are transitions, not suggestions | comply | Tree binding and the CI gate are gate evaluations, not prose. |
| The approver is never the author or the prompter | comply | Approvals stay human; export never creates one. |
| Humans own the acceptance bar | comply | No task fills `Approved-by`; the spec stays unsigned until G1. |
| Done = recorded evidence | comply | Export reads only records the CLI wrote; no prose evidence. |
| Disk is state, chat is not | comply | Git state and approvals are read from disk on every evaluation. |
| Secrets never land in files | comply | Existing redaction and credential-flag refusal apply to exports. |
| Fail loud, never fake green | comply | Export verification exits non-zero on mismatch; degraded modes print. |
| Process matches stakes | comply | The feature is `standard`; lanes and gate sets are unchanged. |
| Least code, no dependency without a decision | comply | Four modules, built-ins only; D-07 records the constraint. |

## Decisions

| # | Decision | Alternatives considered | Why | Ladder rung |
|---|---|---|---|---|
| D-02 | npm trusted publishing with provenance | long-lived token / manual publish | Removes a standing credential; provenance is an install-time trust signal | platform |
| D-03 | Record `head` + `tree` on every approval | artifact hashes only / signed commits | Detects the exact gap Spec Kitty and AI-DLC exposed without key management | existing code |
| D-04 | Native hooks where stable, CI gate everywhere | Claude-only / seven native adapters | A broken adapter is worse than an honest CI-only level | existing platform |
| D-05 | in-toto Statement + DSSE, optional signing | custom JSON / Sigstore-only | Standard consumers; offline verification; no default network trust | stdlib |
| D-06 | Keep the name | rename / sub-brand | Already declined; migration cost before launch is not justified | no change |
| D-07 | Zero-dependency core, external optional tools | add packages / vendor | `npx` weight and supply-chain surface are part of the promise | stdlib |
| D-08 | One program spec with phases | eight feature specs / backlog | The first three tasks share the same release decision | process |

## Research & unknowns

| # | Unknown | Decision | Rationale | Alternatives considered |
|---|---|---|---|---|
| 1 | Does the npm account support trusted publishing? | Try OIDC first; fall back to a scoped automation token | Short-lived credentials are strictly better; the fallback is documented | Manual publish |
| 2 | Which harnesses expose stable lifecycle hooks? | Claude native; probe Codex, Copilot and Antigravity; CI otherwise | Hook APIs are new and churn; a false `native` claim is worse than `ci` | Assume all hooks work |
| 3 | Does a whole-tree hash cause approval churn? | Start with whole tree, exempt `evidence/`; narrow to the feature diff if churn is real | Stricter first; F-03 flags the risk | Artifact hash only |
| 4 | What exact predicate shape should the attestation use? | `https://aisdlc.dev/attestation/gate-evidence/v1` with subject = feature artifacts | Mirrors SLSA statement shape so consumers can pattern-match | Custom schema |
| 5 | Which MCP framing and version? | JSON-RPC 2.0 over stdio, initialize + tools/list + tools/call | The lowest common surface every client supports | HTTP server, MCP Apps |
| 6 | Does SARIF 2.1.0 cover findings and gate failures? | Findings as results, gate failures as invocations with executionSuccessful=false | Standard scanners already ingest it | Custom JSON |

## Data model

Approvals are additive; old entries remain valid.

```
approvals.json entry (v3)
{
  "gate": "G1|G4|G5",
  "by": "<human identity>",
  "hash": "<artifact hash the approval is bound to>",
  "prev": "<previous entry id or null>",
  "at": "<ISO timestamp>",
  "head": "<40-char commit sha, optional>",
  "tree": "<64-char tree sha, optional>",
  "git": "bound | unavailable",
  "note": "<optional>"
}
```

Evidence records gain a schema version and git fields; existing records stay readable.

```
evidence record (schema 2)
{
  "schema": 2,
  "feature": "<slug>",
  "label": "full|green|red|baseline|smoke|spike|blocked|deploy",
  "command": "<requested>",
  "argv": ["<executed>"],
  "exitCode": 0,
  "startedAt": "<ISO>",
  "finishedAt": "<ISO>",
  "sourceBefore": "<hash>",
  "sourceAfter": "<hash>",
  "head": "<commit sha or null>",
  "tree": "<tree sha or null>",
  "checksum": "<sha256 of the record body>"
}
```

Export bundle:

```
<out>/
  statement.json   in-toto Statement v1, predicateType gate-evidence/v1
  envelope.json    DSSE envelope (payloadType application/vnd.in-toto+json)
  findings.sarif   SARIF 2.1.0; omitted when there are no findings
  verify.md        exact offline verification commands and what they prove
```

Retention: the life of the repository. No PII is required. Commands and paths can be sensitive, so existing redaction applies before writing.

## Interface contracts

- `aisdlc doctor [--json]`: `harnesses[]` entries `{ id, detected, enforcement: native|ci|none, install, guard, reason }`.
- `aisdlc approve <gate> <feature> --by <human> [--note]`: writes `head`, `tree`, `git` when a repository exists.
- `aisdlc gate <G1..G6>`: a changed tree outside `evidence/` fails with `STALE_APPROVAL` and names the re-approval command.
- `aisdlc export <feature> [--format all|in-toto|sarif] [--out <dir>] [--sign <command>]`: writes the bundle; `--sign` receives the envelope path and must exit zero. No signer means unsigned output with an explicit note.
- `aisdlc mcp --stdio`: JSON-RPC 2.0; methods `initialize`, `tools/list`, `tools/call`; tools `next`, `status`; any other tool name returns an error that points at the CLI.
- `package.json`: `"skills": ["skills"]` for the skills CLI; version is the single source for every manifest.
- Portable manifests: root `plugin.json`, `.agents/plugins/marketplace.json` for Codex, `.github/plugin/marketplace.json` for Copilot, `.claude-plugin/` unchanged for Claude. **Deferred (T13): the portable schema is unverified, F-02.**
- `aisdlc ci [feature] [--json]`: for every feature, validates the spec, then evaluates each lane-required gate the flow has crossed or a human has already signed, plus stale evidence, artifact-hash staleness and tree drift. Exits 1 on any problem. This is the verb `.github/workflows/gates.yml` runs, and it is the enforcement layer for harnesses with no native hook.
- `doctor [--json]`: `{ detected, enforcement[], testPolicy, companions, skills }`; each `enforcement` entry is `{ id, label, enforcement: native|ci|none, reason, install, retired }`. `native` requires a guard module the project can point at, `ci` requires the gate workflow, and neither is inferred from a harness's advertised capabilities.
- Harness registry now carries `antigravity` and `devin`; `gemini-cli` and `windsurf` remain installable, write into their compatible layouts and print a retirement notice. `.devin/skills` is a companion search root.
- Exports: in-toto Statement v1, DSSE, SARIF 2.1.0. All JSON, UTF-8, stable key order where practical.

## Seams (tests attach here)

- `engine.js` gate and hash functions: existing, pure, unit-tested.
- `provenance.js`: new, accepts an injected command runner so tests never need a real repo.
- `export.js`: new, takes a parsed feature snapshot and returns strings, pure.
- `mcp.js`: new, takes a line reader and returns responses, so tests drive it in-process.
- `harness-probe.js`: new, takes a filesystem probe function.
- Workflows: `.github/workflows/gate.yml` reusable job.
- Manifests: root `plugin.json`, package `skills` field.
- Guard: `hooks/aisdlc-guard.mjs`, toggled by the existing manifest, unchanged contract.

## Design checklist answers

The applicable clusters from the `aisdlc-plan` checklists, answered here rather than left for review.

Touched, delivery and operations:

- **65 CI/CD**: steps are test, corpus check, publish, deploy. Credentials are short-lived OIDC, not a standing token. The rollback trigger is a failed smoke path. Velocity here is measured against change-failure rate, not release count.
- **66 Build caching**: npm cache keyed on `site/package-lock.json`; a stale lock is the bug caching can hide, so the build runs `npm ci`.
- **67 Infrastructure as Code**: the three workflow files are the whole infrastructure; the diff is the review, and there is no apply step.
- **71 Canary releases**: prereleases publish to the `next` dist-tag and only move to `latest` after the smoke path passes on the tagged commit.
- **73 Rollbacks**: deprecate the version, publish a patch from the last good commit, redeploy that commit to Pages. Published tags never move.
- **77/78 Versioning**: approval and evidence record fields are additive, so old files stay readable; the package follows semver, and the export format is versioned in the predicate type.
- **100 Logging**: the evidence record is the log: argv, exit code, timestamps, source fingerprints, redacted output.
- **101/105 Observability**: `aisdlc report` is the dashboard; an export answers "who signed what, on which tree, and did it pass".
- **104 Alerts**: the CI gate is the only page, and it blocks rather than notifies. There is no pager to wake at 3:14 AM.
- **107/108 SLOs and budgets**: the numbers live in `guardrails.yaml`; the error budget is failed releases per 100.

Not touched, with the reason: no datastore (2, 4, 5, 20 to 24), no running server or user-facing traffic (1, 3, 9, 18, 54 to 58, 74 to 75, 84 to 85, 87 to 88, 90 to 92), no in-process concurrency (14, 15, 25 to 27, 31, 80, 82), no queues or scheduled jobs (36 to 41), no regions or failover (93 to 95, 96, 98, 99), no Kubernetes or Helm (61 to 64, 81), no runtime feature flags (69), no blue-green or rolling fleet (70, 72), no external fetch of user-supplied URLs (45), no browser surface (42 to 44). Where the feature does write files and read git, the security answers are already in the Threat model: 19, 47, 48, 49, 50.

## Threat model

| Asset | Threat | Mitigation | Requirement |
|---|---|---|---|
| Approval integrity | Agent writes a name into `Approved-by` | Guard blocks the write; SoD rejects self-approval; CI gate re-checks | Bind approvals to the tree |
| Approval freshness | Code changes after G4, before merge | `head`/`tree` binding; fail closed on movement | Bind approvals to the tree |
| Evidence integrity | Hand-written evidence file | CLI-only writes; checksums; guard blocks evidence writes | Export portable evidence |
| Credentials | npm token exfiltration | Trusted publishing with short-lived OIDC; least-privilege workflow | Publish a release |
| Supply chain | Malicious skill or plugin | Corpus checker, manifest validation, external scan before listing | Package for every marketplace |
| Prompt injection | Untrusted repo content steers the agent | Skills are untrusted input; no secrets in context; deny reads of `.env` | Keep public claims checkable |
| CI identity | Stolen long-lived token | OIDC, environment protection, no token in repo secrets when avoidable | Publish a release |
| False assurance | Unsigned export read as authorship proof | Printed limitation; optional external signature; verifier states what it proves | Export portable evidence |

## Work breakdown (tracer bullets)

- T1 [R:Deploy the site] Pin Node 22 in the Pages build and prove a green deploy on a branch.
- T2 [R:Publish a release] Add OIDC permissions and `--provenance`; prove with a prerelease.
- T3 [R:Publish a release] Re-tag at HEAD, create the release from the successful run.
- T4 [R:Deploy the site] Verify the live pages contain the released commit.
- T5 [R:Keep public claims checkable] Replace stale competitor claims; add the October 2026 section.
- T6 [R:Bind approvals to the tree] Add `head`/`tree`/`git` to new approval entries.
- T7 [R:Bind approvals to the tree] Fail a gate when the tree moved outside evidence; cover every case.
- T8 [R:Bind approvals to the tree] Surface the binding and staleness in `report`.
- T9 [R:Report enforcement honestly] Implement `doctor --json` enforcement matrix.
- T10 [R:Gate a pull request in CI] Add the reusable gate workflow with SARIF upload.
- T11 [R:Report enforcement honestly] Add native adapters only where the hook API is verified.
- T12 [R:Support current harness names] Add Antigravity and Devin targets with legacy aliases.
- T13 [R:Package for every marketplace] Add the portable manifests and the `skills` entry.
- T14 [R:Expose read-only state over MCP] Implement `mcp --stdio` with `next` and `status`.
- T15 [R:Package for every marketplace] Publish the skills listing and run an external security scan.
- T16 [R:Export portable evidence] Build the in-toto statement and DSSE envelope.
- T17 [R:Export portable evidence] Build the SARIF export.
- T18 [R:Export portable evidence] Add `export`, the offline verifier and tests.
- T19 [R:Export portable evidence] Add the optional external signer adapter.
- T20 [R:Publish evals] Build the seeded fake-green eval suite and publish results.
- T21 [R:Keep public claims checkable] Write the launch post and the honest positioning page.

## Traceability

| Requirement | Tasks |
|---|---|
| Publish a release | T2, T3 |
| Deploy the site | T1, T4 |
| Bind approvals to the tree | T6, T7, T8 |
| Report enforcement honestly | T9, T11 |
| Gate a pull request in CI | T10 |
| Export portable evidence | T16, T17, T18, T19 |
| Expose read-only state over MCP | T14 |
| Support current harness names | T12 |
| Package for every marketplace | T13, T15 |
| Keep public claims checkable | T5, T21 |
| Publish evals | T20 |

## Verification strategy

Kind `lib`: API contract tests, semver discipline, back-compat.

- Unit tests: `engine.js` gate cases, provenance with an injected runner, export builders, MCP framing.
- Integration tests: CLI commands in temporary fixtures, including no-git projects and Windows paths.
- Workflow tests: run `gh workflow run gate.yml` on a branch; the publish and deploy workflows are proven by a prerelease and a branch deploy, never by claiming they work.
- Export tests: a pure Node verifier plus optional `ssh-keygen -Y verify` or `cosign verify-blob`.
- Compatibility: old approvals and evidence records parse; new fields are optional; `doctor --json` is additive.
- Full suite: `npm --prefix packages/cli test`
- Corpus: `node packages/cli/scripts/check-skills.mjs`
- Site: `cd site && npm ci && npm run build`
- Plugin: `claude plugin validate .`

## Smoke path

The shortest end-to-end proof a stranger can run, in order:

```
npm --prefix packages/cli test
node packages/cli/scripts/check-skills.mjs
node packages/cli/bin/aisdlc.js doctor --json
node packages/cli/bin/aisdlc.js export demo --format all --out .tmp/export
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node packages/cli/bin/aisdlc.js mcp --stdio
cd site && npm ci && npm run build
cd .. && claude plugin validate .
```

Expected observations: the suite passes; the corpus check passes; `doctor` prints an enforcement level for every harness; the export directory holds `statement.json`, `envelope.json` and `verify.md`; MCP returns `next` and `status`; the site builds; the plugin validates. This is the target state; until T18 lands, the export and MCP commands do not exist.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Scope creep across five phases | high | high | D-08, phase gates, split at five tasks |
| Harness hook API churn | high | medium | D-04, CI fallback, honest `doctor` |
| Approval churn from tree binding | medium | medium | Start strict, narrow scope if F-03 proves real |
| Zero-dependency complexity | medium | medium | Built-ins only; external signers optional |
| Publish credentials unavailable | medium | high | F-01, documented token fallback |
| Marketplace review delays | medium | low | Ship the npm and plugin paths first |
| Site and CLI version drift | medium | medium | One version source, release check in T3 |
| Naming collision with AWS AI-DLC | high | medium | D-06; compete on the phrase, never imply affiliation |

## Rollback thinking

- Releases: npm versions are immutable. Roll back by deprecating the bad version and publishing a patch; never move a published tag.
- Approval fields are additive. Old entries remain readable; no migration runs.
- Tree binding can be relaxed per project with an `aisdlc.json` setting if churn proves unacceptable.
- Workflows revert as files. The previous Pages deployment stays live on a failed build.
- `export` and `mcp` are new commands; removing them touches no existing path.
- No database, no migration, no stored user data.
