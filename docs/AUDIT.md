# End-to-end review and validation

Review date: 2026-10-14. Scope: every **85 original project-owned tracked files**, plus new tests and
this report. Initial working tree was clean. The lead reviewed the CLI and root documentation;
specialist reviews read all48 assigned process/docs/artifact files and all21 site/integration files.
Coverage is a team file-by-file review, not a claim that one model independently read every file twice.

Installed dependencies, Git internals, generated package copies, build output and caches were not
reviewed as authored source. The entire original5,543-line site lockfile was read; its generated
replacement is checked through lock assertions, installation, audit and build tests. The PNG was
visually inspected, and SVG source/markup reviewed. Historical external research claims were not
reverified against every third-party project.

## Current state

The project is a local-first process kit: **20 canonical skills**, a zero-dependency Node CLI,
seven named coding harness integrations plus the universal layout, two read-only agent definitions,
a Claude Code guard mod and an Astro static site. Core architecture is sound: pure gate functions
separate policy from filesystem/process operations, and skills articulate ownership and workflow.
The initial29 tests passed, but did not cover substantial enforcement and integration failures.

The review expanded validation to **66 CLI tests +12 guard tests +6 site tests =84 tests**. These
all passed on Windows with Node24.21.0. The site generated23 pages. Claude Code2.1.296 accepted
its marketplace/hooks. Site dependency auditing and its post-upgrade validation are recorded below.

The demo is **unfinished scaffolding**, not a passing feature. Its nine original artifacts remain
unchanged: no approvals were fabricated, tasks were not checked off, and placeholders were not
converted into fake signatures/evidence.

## What was fixed

### Policy, artifacts and approvals

- Count distinct normalized approvers; whitespace/case duplicates cannot satisfy regulated counts.
- Refuse author self-approval even with a force flag and refuse agent lane downgrades.
- Bind G1 to spec+plan, G4 to spec+acceptance, G5 to spec+acceptance+rollout with unambiguous framing.
- Enforce regulated G4 counts rather than accepting one literal signature.
- Reject blank/placeholder signatures and model fields without consuming later lines.
- Require every acceptance row to cite recorded green current-source evidence and map to a spec scenario;
  reject missing/unknown scenarios and duplicate IDs. Keep technical blockers agent-owned.
- Group Claude variants together and GPT/o-series together; alias switching is not independent review.
- Reject placeholder n/a waivers, unexplained degradation and unmeasured template guardrail budgets.
- Bound rollback steps to their own section, and require filled delta decisions for decided counts.

### CLI, evidence and filesystem boundaries

- Validate configuration before installer mutation; malformed JSON no longer silently becomes empty state.
- Reject traversal and unsafe slug/label/task names before execution/writes.
- Preserve equals signs and boolean argument semantics; reject unknown/missing flags.
- Make JSON failure/staleness exit codes meaningful; skipped gates do not fail a lane.
- Record requested/executed argv, record checksum and source fingerprint before/after a command.
- Detect uncommitted edits, deletions, Markdown output changes and deep no-Git source files.
- Keep valid legacy history readable but exclude it from proof; a fresh record can recover the gate.
- Detect partial record corruption, refuse broken approval chains, and expose evidence errors in audit.
- Reject common credential flags, redact recognized secret output and scan all matching literals;
  a nearby placeholder no longer suppresses a real key.
- Resolve standard Windows package-manager shims to Node scripts, never concatenate their argv in a shell.
- Protect physical source/destination aliases, support cross-drive installation, preserve extra copied
  files, and use Windows junctions where link-mode symlinks would require privileges.
- Package sync includes MIT attribution alongside canonical skills and agents.

### Skills, plugin, site and release integration

- Remove handwritten gate-evidence fallback; manual logs remain diagnostics and cannot earn DONE.
- Correct quick/spike routing, human-owned stops, CLI commands, baseline recording, analysis-only tasks,
  model provenance and reapproval instructions. A human explicitly unlocks a signed spec before an agreed delta.
- Distinguish historical platform/billing research from the shipped local-first product.
- Fix invalid plugin JSON, command caching, the actual mods API exitCode result field, Windows path handling,
  Edit/MultiEdit signatures, target-spec checks, compound evidence exemptions and fail-open UI behavior.
- Fix per-page metadata, skill source discovery, code-punctuation fidelity, duplicate heading anchors,
  clipboard error feedback, mobile navigation and package links.
- Wire guard/site tests into CI; correct release permissions/actions and deployment concurrency.
- Make SVGs accessible/static and place G1–G6 on their actual transitions through DONE.
- Remove impossible authenticity guarantees and document local trust/detector boundaries.

## Validation matrix

| Layer | Executed result |
|---|---|
| Original CLI baseline |29/29 passed before edits|
| Expanded CLI unit/integration/platform suites |66/66 passed; all20 command entries exercised in temporary fixtures|
| Harness installer |All eight layouts; copies, repeated installation, preserved instructions, commands/agents and Windows junction links passed|
| Gates and flow |All six gates, four lanes, forward flow, regressions, distinct approval counts, staleness and technical ownership covered|
| Evidence |Success/nonzero/missing command, exact argv, current-source proof, changed-during-run, corruption, legacy recovery and redaction passed|
| Secret detector |Pattern and JSON exit regressions passed; repository scan returned an empty finding array|
| Skill corpus |20 skills /51 claim-bearing files /20 CLI commands passed, including this report; manual fallback path has a92% budget warning|
| Guard tests |12/12 passed, with official exitCode-shaped process mocks and flattened tool events|
| Actual Claude validator |Claude Code2.1.296 marketplace/hooks validation passed; it notes gating handlers without .catch, which use explicit try/catch|
| Site tests |6/6 passed: discovery, Markdown/code preservation, anchors/outline, clipboard and lockfile assertions|
| Static production build |23 pages generated successfully with Astro7.3.8 after the final transitive patch|
| Dependency audit |Initial7 vulnerable groups, including critical Astro, fixed; final audit reports0 known vulnerabilities|
| Package inspection |Final dry-run33 entries includes20 skills, both agents, CLI sources and LICENSE; no publication performed|
| SVG/demo checks |Both flow SVGs parsed as XML; demo artifact diff was empty|
| Diff hygiene |Final whitespace/error check passed after source/dependency and report updates|

## File-by-file coverage: original85 files

Each entry was read or, for the PNG, visually inspected. “Unchanged” means no justified source edit,
not that the reviewer merely skipped it. Test execution is represented by the matrix above, not claimed
individually for prose, licenses or external operational services.

| File | Review outcome |
|---|---|
|[marketplace.json](../.claude-plugin/marketplace.json)|Manifest identity checked; marketplace description added|
|[plugin.json](../.claude-plugin/plugin.json)|Invalid trailing comma fixed|
|[CI](../.github/workflows/ci.yml)|Test coverage and least-privilege token checked/improved|
|[deploy workflow](../.github/workflows/deploy.yml)|Active deployment cancellation corrected|
|[publish workflow](../.github/workflows/publish.yml)|Release action, manual-dispatch behavior and permissions fixed|
|[ignore rules](../.gitignore)|Generated artifacts checked; packaged LICENSE ignored|
|[changelog](../CHANGELOG.md)|Review/migration/testing changes recorded|
|[contributing](../CONTRIBUTING.md)|Full validation and trust-boundary instructions updated|
|[design](../DESIGN.md)|Design constraints read; grammar corrected|
|[license](../LICENSE)|MIT terms reviewed; root preserved, package attribution fixed|
|[product](../PRODUCT.md)|Skill count and product scope consistent; unchanged|
|[README](../README.md)|Install, command and ownership claims reviewed; honest verification limits added|
|[researcher](../agents/aisdlc-researcher.md)|Unnecessary Bash capability removed from read-only role|
|[scout](../agents/aisdlc-scout.md)|Role/model/tools contract reviewed; unchanged|
|[project marker](../aisdlc.json)|Project layout and approval policy read; unchanged|
|[dark flow](../assets/flow-dark.svg)|Accessibility, static behavior and gate placement fixed|
|[light flow](../assets/flow-light.svg)|Accessibility, static behavior and gate placement fixed|
|[dark hero](../assets/hero-dark.svg)|Authenticity overclaim removed; static accessible art|
|[light hero](../assets/hero-light.svg)|Authenticity overclaim removed; static accessible art|
|[next command](../commands/aisdlc-next.md)|Human-owner stop and fallback path corrected|
|[report command](../commands/aisdlc-report.md)|Exit/staleness recovery instructions corrected|
|[status command](../commands/aisdlc-status.md)|Blocker query and human signature instructions corrected|
|[competitor research](../docs/COMPETITORS.md)|Entire historical research read; duplicate section number corrected|
|[research](../docs/RESEARCH.md)|Entire text read; historical platform claims explicitly separated|
|[constitution](../docs/constitution.md)|Invariants read; unchanged|
|[conventions](../docs/conventions.md)|Read before skill changes; budgets/portability respected|
|[demo acceptance](../docs/features/demo/acceptance.md)|Pending/placeholder state reviewed; preserved|
|[demo approvals](../docs/features/demo/approvals.json)|Empty array reviewed; preserved|
|[demo feature](../docs/features/demo/feature.json)|Metadata reviewed; preserved|
|[demo guardrails](../docs/features/demo/guardrails.yaml)|Placeholder kill switch/budgets noted; preserved|
|[demo plan](../docs/features/demo/plan.md)|Stub/missing detailed sections noted; preserved|
|[demo rollout](../docs/features/demo/rollout.md)|Placeholder flag/tag/commands noted; preserved|
|[demo runbook](../docs/features/demo/runbook.md)|Unusable placeholder contacts noted; preserved|
|[demo spec](../docs/features/demo/spec.md)|Clarifications/signature/source placeholders noted; preserved|
|[demo tasks](../docs/features/demo/tasks.md)|Unchecked task reviewed; preserved|
|[taste](../docs/taste.md)|Actual CLI runner documented; remaining UI taste is advisory|
|[CLI README](../packages/cli/README.md)|Evidence, approvals, Windows and publication limits documented|
|[CLI entry](../packages/cli/bin/aisdlc.js)|Entry/delegation reviewed; unchanged|
|[CLI manifest](../packages/cli/package.json)|Zero dependencies, engines, bins/files/scripts reviewed; unchanged|
|[corpus checker](../packages/cli/scripts/check-skills.mjs)|All rules read and executed; method/field-shape limitations documented|
|[package sync](../packages/cli/scripts/sync-skills.mjs)|Canonical copies, fixed deletion targets and MIT attribution improved|
|[CLI commands](../packages/cli/src/cli.js)|All command/config/process paths reviewed and hardened|
|[engine](../packages/cli/src/engine.js)|All parsers, gates, lanes, flow, summaries and chain checks reviewed/hardened|
|[filesystem helpers](../packages/cli/src/fsx.js)|Source resolution, JSON, installer, traversal and platform argv hardened|
|[harness registry](../packages/cli/src/harnesses.js)|Every layout and companion contract read; unchanged|
|[templates](../packages/cli/src/templates.js)|Every seed read; measured guardrails required|
|[engine tests](../packages/cli/test/engine.test.js)|Entire suite read; fixtures updated to stricter contracts|
|[template tests](../packages/cli/test/templates.test.js)|Entire suite read; seed expectations corrected|
|[Astro config](../site/astro.config.mjs)|Static/base configuration reviewed; unchanged|
|[site lock](../site/package-lock.json)|Entire original lock read; replacement generated/validated after security upgrade|
|[site manifest](../site/package.json)|Test script added; security upgrade underway|
|[favicon](../site/public/favicon.svg)|SVG reviewed; unchanged|
|[social image](../site/public/og.png)|1200×630 PNG visually inspected; dark appearance noted, unchanged|
|[site layout](../site/src/layouts/Base.astro)|Canonical/social metadata corrected|
|[base helper](../site/src/lib/base.js)|Path behavior reviewed; unchanged|
|[skill renderer](../site/src/lib/skills.js)|Discovery, code fidelity and anchors corrected|
|[docs page](../site/src/pages/docs.astro)|Entire source read; unchanged|
|[home page](../site/src/pages/index.astro)|Clipboard integration and layout reviewed/fixed|
|[skill index](../site/src/pages/skills.astro)|Entire source read; unchanged|
|[skill detail](../site/src/pages/skills/[slug].astro)|Clipboard/rendering integration reviewed/fixed|
|[site styles](../site/src/styles/global.css)|Gutters/mobile navigation corrected|
|[brainstorm](../skills/aisdlc-brainstorm/SKILL.md)|Lane/entry interview contract read; unchanged|
|[brownfield](../skills/aisdlc-brownfield/SKILL.md)|Portable baseline exploration corrected|
|[craft](../skills/aisdlc-craft/SKILL.md)|Companion/fallback/ownership contract read; unchanged|
|[debug](../skills/aisdlc-debug/SKILL.md)|Failure/debug/evidence routing read; unchanged|
|[delta](../skills/aisdlc-delta/SKILL.md)|Agreement, signature unlock, hashes and validators corrected|
|[discover](../skills/aisdlc-discover/SKILL.md)|Recommended-answer interview guidance corrected|
|[flow](../skills/aisdlc-flow/SKILL.md)|Entire router read; unchanged|
|[manual flow](../skills/aisdlc-flow/references/manual-derivation.md)|Order/lane/evidence rules corrected; no handwritten proof|
|[grill](../skills/aisdlc-grill/SKILL.md)|Quick/spike clarification bypass removed|
|[handoff](../skills/aisdlc-handoff/SKILL.md)|Artifact/context contract read; unchanged|
|[implement](../skills/aisdlc-implement/SKILL.md)|Recorded portable baseline commands corrected|
|[plan](../skills/aisdlc-plan/SKILL.md)|Constitution review and intent-binding clarified|
|[ponytail](../skills/aisdlc-ponytail/SKILL.md)|Trivial-change exemption cannot waive required gates|
|[quality](../skills/aisdlc-quality/SKILL.md)|Tools/fallback/evidence guidance read; unchanged|
|[release](../skills/aisdlc-release/SKILL.md)|Lane endings and combined approval hash corrected|
|[retro](../skills/aisdlc-retro/SKILL.md)|Real byte/hot-path conventions used|
|[review](../skills/aisdlc-review/SKILL.md)|Historical author provenance, families, scenarios and approval counts corrected|
|[review exit](../skills/aisdlc-review/references/pushback-and-exit.md)|Entire refusal/exit contract read; unchanged|
|[spec](../skills/aisdlc-spec/SKILL.md)|Validator vs G2 checks and human-only signatures corrected|
|[tasks](../skills/aisdlc-tasks/SKILL.md)|Analysis-only/read-only path made explicit|
|[taste skill](../skills/aisdlc-taste/SKILL.md)|Steering/ownership contract read; unchanged|
|[verify](../skills/aisdlc-verify/SKILL.md)|Full-suite command, source proof and waiver reason corrected|
|[guard source](../hooks/aisdlc-guard.mjs)|Entire mod read; runtime API/cache/signature/path/compound checks fixed|
|[guard manifest](../hooks/hooks.json)|Current official modules contract and file path verified; unchanged|

## New reviewed files

- [CLI integration tests](../packages/cli/test/cli.test.js): all commands, install layouts, fixture flow, errors and migration behavior.
- [Hardening tests](../packages/cli/test/hardening.test.js): parser/gate/approval/scenario/trust regressions.
- [Platform edge cases](../packages/cli/test/edgecases.test.js): Windows argv, physical aliases, legacy recovery, deep sources and signatures.
- [Guard regressions](../hooks/test/guard.test.mjs): runtime-shaped host process/tool/UI mocks and manifest assertions.
- [Site regressions](../site/test/site.test.mjs): renderer, clipboard, discovery and lock checks.
- [Clipboard helper](../site/src/lib/copy.js): honest accessible success/failure feedback.
- This audit report: coverage, verified results, migration rules and limitations.

## Compatibility and residual limitations

1. **Human action is required after approval hash changes.** Re-review/re-approve; never rewrite an old chain.
2. **Legacy proof must be rerun.** It remains history; corruption of checksummed records remains an audit failure.
3. **No authenticity guarantee.** A repository writer can recompute checksums/chain hashes, truncate history,
   spoof names/environment or choose an inadequate command. No externally anchored identity/chain head exists.
4. **No exhaustive correctness/security promise.** Detector coverage, acceptance labels and green exits cannot
   prove every behavior was tested. Review actual suites and protect sensitive runtime configuration.
5. **Guard interception is heuristic/fail-open.** Alternate write tools, complex shell syntax and unavailable
   state can escape interception. The guard is not a sandbox or policy boundary.
6. **Untested operational layers:** actual browser keyboard/a11y/visual behavior, interactive Claude sessions,
   third-party addon installs, npm publication, Pages activation and remote CI executions were not performed.
   Local CLI tests ran on Node24; the configured18/20/22 matrix is not a claim those CI runs occurred here.
7. **Source scope:** per-feature process artifacts and installed harness directories are excluded; Git ignores
   are respected only in Git mode. No-Git fallback skips known generated directories and cannot infer all ignores.
8. **Prose cost warning:** manual fallback currently loads92% of its existing path budget. Companion chains are
   not all represented in the five named hot-path budgets; retain progressive disclosure and prune additions.
9. **Historical research and social-image aesthetics:** no wholesale external fact revalidation or browser-based
   image redesign was done. These are not green-tested operational guarantees.

Official guard contract checked against the [Claude Code mods API](https://code.claude.com/docs/en/plugins/mods/api.md),
which documents process results as exitCode/stdout/stderr. Dependency advisories are taken from npm's live audit,
including the initial [Astro image-processing critical advisory](https://github.com/advisories/GHSA-26w7-cxv4-gfx2).
