---
name: aisdlc-craft
description: Bridge to code-craft, the line-level clean-code discipline (the ladder before writing, smell→fix on touched lines only, dead-code deletion with dynamic-reference checks, honest types, rule of three). Use inside aisdlc during BUILD and review, whenever you are about to write or refactor code and want the least, cleanest, properly-typed result - over-engineering, dead/unused code, deep nesting, fat interfaces, any/casts, swallowed errors, copy-paste duplication, god classes. Prefers the official code-craft skill (AnshRoshan/ansh-other-skills) when installed and falls back to an embedded distillation; adds the aisdlc-specific scope rules (craft serves the spec, blast radius, flag-don't-fix, deletion needs evidence).
license: MIT
metadata:
  author: aisdlc
  version: "1.0"
  stage: build
  companion: AnshRoshan/ansh-other-skills (code-craft)
---

# aisdlc-craft

Ponytail decides **whether** the code needs to exist. Craft decides how the code that must exist is written: least lines, honest types, organized so the next change touches few files - then delete what no longer earns its place.

## 0. Companion resolution (silent, every session)

1. If a skill named `code-craft` is available (Claude Code plugin `ansh-other-skills@ansh-other-skills`, a `.agents/skills/code-craft/SKILL.md` copy, or any harness that reads SKILL.md), invoke it for the full ladder, smell→fix tables, and reference files (types, control-flow, naming, organization, refactoring catalog, tests). Then apply §3 of this file.
2. If not installed, apply §1-§3 below. Say once per session: "official `code-craft` not installed; using aisdlc's embedded distillation. Install with `npx aisdlc-cli addon code-craft`."
3. Never install anything without asking.

## 1. The ladder (climb before writing)

Stop at the first rung that solves the problem:

1. **Does it need to exist?** No present, real requirement → don't build it (YAGNI). Existing code now unused and in scope → delete it.
2. **Stdlib / the platform?** Use it; add no dependency.
3. **An already-installed dependency?** Use it before adding a new one.
4. **One line / one expression?** Write that; don't wrap it in a class, layer, or config.
5. **The minimum honest code.** Smallest version with good names and real types.

If you cannot point to **two concrete cases today**, an abstraction (interface, base class, strategy, plugin hook, generic param) is premature. Wait for the third (Rule of Three).

## 2. Smell → fix (touched lines only)

| smell | fix |
|---|---|
| dead / unused code (exports, params, branches) | delete; confirm dynamic references first (reflection, routes, DI, templates) |
| deep nesting | guard clauses, early returns; invert the condition |
| long argument list | options object - but only from 3-4 args that travel together |
| `any` / casts / non-null assertions | type the boundary once, honestly; no lying types to silence the checker |
| swallowed errors / floating promises | handle, wrap with context, or let it crash loudly - never `catch {}` |
| comments restating the code | delete the comment; rename if the code is unclear |
| copy-paste duplication | extract only on the third instance |
| god class / fat interface | split along the seams the change actually uses - not speculative axes |

The official `code-craft` skill carries the full tables and six reference files; this row set covers the 90% case.

## 3. The aisdlc part: craft serves the spec

1. **Blast radius = the task's requirement and its scenario.** Fix in-scope lines; out-of-scope mess gets flagged for `aisdlc-review`, not fixed in passing. Unrequested cleanup is how diffs grow teeth.
2. **Deletion that changes spec-relevant behaviour is a delta.** Dead-code removal touching a `SHALL` line's path goes through `aisdlc-delta`, never a quiet edit.
3. **A tool's candidate list is not proof.** knip/vulture/tsc findings must be confirmed by hand (dynamic references) before deletion - and the deletion still needs the evidence run to pass.
4. **Craft never trades away the never-lazy list** (`aisdlc-ponytail` §4): trust boundaries, data loss, security, a11y, anything the spec says.
5. Report what you changed **and what you deliberately left alone**; the second half is what the reviewer reads first.
