# Changelog

All notable changes to aisdlc are documented here. Format follows [Keep a Changelog](https://keepachangelog.com); versioning follows [SemVer](https://semver.org).

## [Unreleased]

### Added
- `aisdlc check delta <path|feature>`: machine-validates a delta file — Change table types (`modify`/`add`/`remove`/`rename`), Reason + Migration on removals, FROM/TO + Reason on renames, full-text `modify` rows, non-empty change, required sections (`Trigger`/`Change`/`Impact`/`Decision`). Engine `validateDelta`, covered by tests; `aisdlc-delta` runs it alongside its two-directional read.
- Skills depth pass against six competing process kits (research: `docs/COMPETITORS.md`, `docs/RESEARCH.md` §8–§9): constitution check, data model, interface contracts, research table and smoke path in the plan; read-only consistency pass with PASS/CONCERNS/FAIL readiness in tasks; waves, subagent delegation contract, worktree setup and baseline-commit evidence in implement; three review lenses, pushback handling and branch exit decision in review; discovery verdicts (build / spike first / defer / do not build) with optional PR-FAQ; spec §8 UX & interaction; delta `rename` type; constitution amendment procedure and skill-edit hygiene in retro; refusal lists in taste, quality, brownfield, release; re-plan path in plan + flow.
- `test/templates.test.js`: locks the seeds to the skills (constitution header, spec §8, plan's 14 sections, acceptance triage, G5/G6 seed behaviour, always-on steering line).

### Changed
- Seeds now match the skill contracts: constitution carries `Version`/`Amended`, spec carries §8, plan carries the full contract, acceptance carries finding triage and reviewer notes, and the `init` instruction block tells every session to read taste + glossary + constitution before writing code.
- Version aligned to 0.2.0 everywhere (`package.json` was 0.1.0, `cli.js` was 0.2.0, Claude plugin manifests were 0.1.0).
- Two new companion bridges from [ansh-other-skills](https://github.com/AnshRoshan/ansh-other-skills): `aisdlc-craft` (line-level clean-code craft during BUILD, bridged to code-craft) and `aisdlc-quality` (lint/dead-code/complexity/security CLI runner feeding VERIFY and review, bridged to code-quality-tools). Both use the official skills when installed and embedded distillations otherwise. Skill count: 18 to 20; `aisdlc addon code-craft|quality-tools|all` installs them.
- Claude Code plugin support: `/plugin marketplace add AnshRoshan/aisdlc` then `/plugin install aisdlc@aisdlc` installs the 18 skills plus `/aisdlc-next` and `/aisdlc-status` commands (`.claude-plugin/`, `commands/`).
- `publish cli` workflow: tag `vX.Y.Z` (or run manually) to publish the CLI to npm as `aisdlc-cli`; requires the `NPM_TOKEN` repository secret.

### Changed
- Rewrote the README as a proper front page: install matrix (npx, Claude Code plugin, skills.sh, manual), mermaid gate flow, lanes, gates, invariants, skill index.
- Repository homepage now points at the live GitHub Pages site.
- Rebuilt the repository from scratch with clean history.
- Replaced the Next.js website (and the dead SaaS application left inside it) with a static Astro site deployed to GitHub Pages.

## [0.1.0] - 2026

### Added
- 18 Agent Skills covering the full process: flow (router), brainstorm, discover, brownfield, taste, spec, plan, tasks, implement, debug, verify, review, release, retro, plus the cross-cutting grill, ponytail, delta, handoff.
- Zero-dependency CLI (`npx aisdlc-cli`): harness installation, feature scaffolding with lanes (`spike`/`quick`/`standard`/`regulated`), EARS spec validation, gates G1–G6, hash-bound approvals, evidence recording, secrets scan.
