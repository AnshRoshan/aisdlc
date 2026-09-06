# Changelog

All notable changes to aisdlc are documented here. Format follows [Keep a Changelog](https://keepachangelog.com); versioning follows [SemVer](https://semver.org).

## [Unreleased]

### Added
- Claude Code plugin support: `/plugin marketplace add AnshRoshan/aisdlc` then `/plugin install aisdlc@aisdlc` installs the 18 skills plus `/aisdlc-next` and `/aisdlc-status` commands (`.claude-plugin/`, `commands/`).
- `publish cli` workflow: tag `vX.Y.Z` (or run manually) to publish the CLI to npm; requires the `NPM_TOKEN` repository secret.

### Changed
- Rewrote the README as a proper front page: install matrix (npx, Claude Code plugin, skills.sh, manual), mermaid gate flow, lanes, gates, invariants, skill index.
- Repository homepage now points at the live GitHub Pages site.
- Rebuilt the repository from scratch with clean history.
- Replaced the Next.js website (and the dead SaaS application left inside it) with a static Astro site deployed to GitHub Pages.

## [0.1.0] - 2026

### Added
- 18 Agent Skills covering the full process: flow (router), brainstorm, discover, brownfield, taste, spec, plan, tasks, implement, debug, verify, review, release, retro, plus the cross-cutting grill, ponytail, delta, handoff.
- Zero-dependency CLI (`npx aisdlc`): harness installation, feature scaffolding with lanes (`spike`/`quick`/`standard`/`regulated`), EARS spec validation, gates G1–G6, hash-bound approvals, evidence recording, secrets scan.
