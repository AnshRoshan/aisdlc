---
name: aisdlc-quality
description: Bridge to code-quality-tools, the runner guide for lint, autofix, dead-code, complexity and security CLIs on JS/TS and Python (fallow, eslint, biome, knip, tsc, ruff, mypy, vulture, bandit, semgrep - which tool, in what order, what mutates vs detects). Use inside aisdlc during BUILD and VERIFY when you need mechanical quality checks, a pre-G3 structural pass, or a security scan, or when the user says "lint", "clean up", "dead code", "typecheck", "security scan", "complexity". Prefers the official code-quality-tools skill (AnshRoshan/ansh-other-skills) when installed and falls back to an embedded distillation; adds the aisdlc-specific wiring (tools advise, the CLI gates; findings become tasks or deltas; only evidence runs count).
license: MIT
metadata:
  author: aisdlc
  version: "1.0"
  stage: verify
  companion: AnshRoshan/ansh-other-skills (code-quality-tools)
---

# aisdlc-quality

The mechanical complement to `aisdlc-craft` (judgment) and `aisdlc-ponytail` (scope): which CLI to run for each quality problem, in what order, and which ones are allowed to touch your files.

## 0. Companion resolution (silent, every session)

1. If a skill named `code-quality-tools` is available (Claude Code plugin `ansh-other-skills@ansh-other-skills`, a `.agents/skills/code-quality-tools/SKILL.md` copy, or any harness that reads SKILL.md), invoke it for the full tool matrix, the language-specific reference files, and the complete fix sequence. Then apply §2 of this file.
2. If not installed, apply §1-§2 below. Say once per session: "official `code-quality-tools` not installed; using aisdlc's embedded distillation. Install with `npx aisdlc-cli addon quality-tools`."
3. Never install anything without asking.

## 1. Embedded distillation

**Mutate vs detect - the one rule.** The only tools that edit code are `ruff format`, `ruff check --fix`, `eslint --fix`, `biome check --write`/`biome format --write`, `prettier --write`, `oxlint --fix`, `knip --fix`, `fallow fix`, `npm audit fix`, `pip-audit --fix`. Everything else (`tsc`, `mypy`, `pyright`, `pylint`, `vulture`, `bandit`, `radon`, `xenon`, `madge`, `jscpd`, `depcheck`, `semgrep`, `osv-scanner`) is detect-only. Never claim a detect-only tool autofixes.

**Safe order (JS/TS):** types (`tsc --noEmit`) → lint safe fixes (`eslint --fix` or `biome check --write`) → format (`prettier --write` or biome, never both) → structural pass (`fallow` or `knip` for unused files/exports/deps) → detect-only extras (complexity, jscpd duplication, `madge --circular`, security: `eslint-plugin-security`/`semgrep`, CVEs: `npm audit`/`osv-scanner`).

**Safe order (Python):** import sort → `ruff check --fix` → `ruff format` (sort BEFORE format) → types (`mypy`) → dead code (`vulture`, confirm by hand) → complexity (`radon`/`xenon`) → security (`bandit`, CVEs: `pip-audit`).

## 2. The aisdlc part: tools advise, the CLI gates

1. **Evidence comes from `aisdlc-cli evidence`, nothing else.** A lint or typecheck run only counts for G3 when wrapped: `npx aisdlc-cli evidence <slug> --label quality -- <command>`. A green linter output pasted in chat is not evidence.
2. **Findings route, they don't auto-apply.** A detect-only finding becomes (a) a fix task in `tasks.md`, (b) an `aisdlc-delta` if it reveals the spec was wrong, or (c) a review finding in `acceptance.md`. A mutating tool may only run on the task's blast radius - a repo-wide `--fix` inside a BUILD task is scope creep with a commit attached.
3. **Deletion needs confirmation, then evidence.** knip/vulture candidates are candidates until a human-checked dynamic-reference pass says otherwise; the deletion still has to survive the full evidence run.
4. **Secrets are the CLI's job.** G3's secrets scan runs inside `aisdlc verify`; bandit/semgrep findings complement it and route as findings.
5. **New tool commands the project should always run?** Put them in the project's own gate command (the one `aisdlc verify` wraps), not in a side script - the gate is the contract.
