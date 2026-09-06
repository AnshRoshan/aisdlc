# aisdlc

**Agents write code. aisdlc runs the process.** Open source (MIT), harness-agnostic, local-first.

aisdlc is a process kit for AI-assisted engineering: a set of [Agent Skills](https://agentskills.io) plus a zero-dependency Node CLI that turns "the agent said it's done" into evidence you can audit.

[![CI](https://github.com/AnshRoshan/aisdlc/actions/workflows/ci.yml/badge.svg)](https://github.com/AnshRoshan/aisdlc/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/aisdlc.svg)](https://www.npmjs.com/package/aisdlc)
[![site](https://img.shields.io/badge/site-aisdlc.dev-111.svg)](https://aisdlc.dev)

## What's in the box

| path | what | ship as |
|---|---|---|
| [`skills/`](skills/) | 18 canonical Agent Skills: `aisdlc-flow` (router), stage skills (`-brainstorm`, `-discover`, `-brownfield`, `-taste`, `-spec`, `-plan`, `-tasks`, `-implement`, `-debug`, `-verify`, `-review`, `-release`, `-retro`) and cross-cutting ones (`-grill`, `-ponytail`, `-delta`, `-handoff`) | `npx skills add AnshRoshan/aisdlc` |
| [`packages/cli/`](packages/cli/) | zero-dependency Node CLI: installs skills into any harness, scaffolds features, validates EARS specs, gates G1–G6, evidence, SoD approvals, secrets scan | `npx aisdlc` (npm) |
| [`site/`](site/) | static marketing + docs site, built with Astro, deployed to GitHub Pages | [aisdlc.dev](https://aisdlc.dev) |

## Quick start

```bash
cd /path/to/your/repo
npx aisdlc init
```

Then open Claude Code / Codex / Cursor / Gemini in that repo and say: *"use aisdlc-brainstorm, I want to build …"* (or *"use aisdlc-debug"* for a bug). It classifies the work into a lane (`spike` · `quick` · `standard` · `regulated`), interviews you with recommended answers, and routes to the right skill. Every stage ends with `npx aisdlc next`, and the agent obeys the disk, not the chat.

## Develop locally

```bash
# CLI (no publish needed)
git clone https://github.com/AnshRoshan/aisdlc && cd aisdlc/packages/cli
npm test                                   # engine tests (node:test)
npm link && aisdlc init

# Site
cd site && npm install && npm run dev
```

## Design notes

- The eight invariants and the G1–G6 gate model come from the original aisdlc PRD; the platform/SaaS shape from the earlier blueprint was dropped in favour of "everyone's laptop is the sandbox".
- Skills follow the open SKILL.md format so they work unchanged across harnesses; the CLI adds slash commands where a harness supports them.
- All checks are pure functions over files (`packages/cli/src/engine.js`). Same files, same answer, any machine.
- Lanes came from studying superpowers' spike/bounded/architectural split; the interview discipline from mattpocock's grilling; the minimal-code ladder from ponytail. Where a maintained skill already exists we bridge to it instead of forking it (see [`docs/RESEARCH.md`](docs/RESEARCH.md) §7).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Issues and PRs welcome.

MIT — see [LICENSE](LICENSE).
