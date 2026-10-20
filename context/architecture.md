# Architecture

## Tech stack, tool and role

| Tool | Version | Role | Why this tool |
|---|---|---|---|
| Node.js | >=18 (CLI), >=22.12 (site) | Runtime for the CLI and the Astro build | No install step, available everywhere; the CLI uses built-ins only |
| ESM JavaScript | native | CLI and engine source | No build step; readable on disk; same code the user runs |
| Agent Skills (SKILL.md) | open format | The 20 process skills | Portable across harnesses; progressive disclosure keeps context cost low |
| Astro | 7.3.8 | Static documentation site | Static output, no runtime server, GitHub Pages deploy |
| GitHub Actions | hosted | CI, Pages deploy, npm publish | The project's only automation surface |
| Claude Code mods | current API | The `aisdlc-guard.mjs` enforcement layer | In-process hooks can block actions, not just advise |
| node:test | built-in | Test runner | Zero dependency, works on every supported Node |

Full decision rationale lives in `context/decisions.md`; competitor research lives in `docs/COMPETITORS.md`.

## Folder structure

```
packages/cli/
  bin/aisdlc.js        entry, delegates to src/cli.js
  src/cli.js           command parsing and filesystem/process effects
  src/engine.js        pure functions: lanes, gates, parsers, hashes, flow, report
  src/fsx.js           filesystem helpers, installer, Windows-safe argv
  src/harnesses.js     harness layouts and companion contracts
  src/templates.js     seeds for every artifact
  scripts/check-skills.mjs   corpus linter: claims against code, budgets, portability
  scripts/sync-skills.mjs    copies canonical skills/agents into the package at pack time
  test/                node:test suites and fixtures
skills/                canonical SKILL.md corpus (edit here only)
agents/                canonical read-only subagent definitions
commands/              slash commands for Claude Code
hooks/                 aisdlc-guard.mjs and its manifest/tests
docs/                  constitution, conventions, taste, research, feature artifacts
context/               project state for agents (this system)
site/                  Astro documentation site
.github/workflows/     ci, deploy site, publish cli
```

## System boundaries and data flow

1. A harness session loads a skill and runs `aisdlc next`. The CLI reads `aisdlc.json`, `docs/features/<slug>/` and `evidence/`, then prints state, blockers and the next skill.
2. The agent writes artifacts (spec, plan, tasks, acceptance, rollout, runbook). The engine parses them with pure functions and returns gate verdicts.
3. `aisdlc evidence` executes the requested command, records argv, exit code, timestamps and source fingerprints, and writes a record under the feature's evidence directory.
4. `aisdlc approve` is human-only. It appends a hash-chained approval entry bound to the artifact hash.
5. The Claude guard reads the cached `next --json` state once per turn and blocks bare test runs, self-approval, writes to evidence/approvals, and edits to signed specs.
6. The site renders `skills/**/SKILL.md` at build time. The corpus checker fails CI when a documented command or skill token does not exist.

## Invariants

- The engine contains no I/O. It takes parsed state and returns verdicts.
- Commands never trust chat. State comes from files.
- Evidence and approvals are written only by the CLI, never by an agent.
- A gate that can be satisfied by rephrasing prose is not a gate.
- No runtime dependency. Optional integrations are external commands with a documented fallback.
- Every documented command exists in `cli.js`; every `aisdlc-*` token names a real skill, command or agent.
- Windows and POSIX behave the same: no shell concatenation, no POSIX-only glue.
- The canonical corpus is `skills/`; `packages/cli/skills/` is generated.

## External dependencies

- npm registry and GitHub Actions for distribution (network, but no runtime dependency).
- GitHub Pages for the site.
- Claude Code for the guard mod; other harnesses get the portable contract and, later, a CI gate.
- Optional external binaries for signing and verification (`ssh-keygen`, `cosign`) when the user asks for them. The core never requires them.
