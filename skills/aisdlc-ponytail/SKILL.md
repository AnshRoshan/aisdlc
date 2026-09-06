---
name: aisdlc-ponytail
description: Bridge to Ponytail, the "lazy senior developer" discipline that forces the simplest, shortest solution that actually works (YAGNI, stdlib before custom code, native platform before dependencies, one line before fifty). Use on every coding task inside aisdlc (plan decisions, implement, review), whenever the user says "ponytail", "be lazy", "simplest", "minimal", "yagni", "do less", or complains about bloat, boilerplate, or over-engineering. Prefers the official ponytail skill (DietrichGebert/ponytail) when installed and falls back to an embedded copy of its ladder and rules; adds the aisdlc-specific list of things you are never allowed to be lazy about (evidence, gates, secrets, spec).
license: MIT
metadata:
  author: aisdlc
  version: "2.0"
  stage: any
  companion: DietrichGebert/ponytail
  upstream_synced: "ponytail SKILL.md, 2026-06 ladder revision"
---

# aisdlc-ponytail

Agents accelerate entropy. Ponytail is the brake. The best code is the code never written; the best diff is the shortest one that passes the spec's scenarios.

## 0. Companion resolution (silent, every session)

Use the official skill whenever you can; it is maintained upstream and benchmarked, and this bridge only mirrors it.

1. If a skill named `ponytail` is available (Claude Code plugin `ponytail@ponytail`, Codex plugin, Copilot `/ponytail:ponytail`, Gemini extension, OpenCode plugin, or a `.agents/skills/ponytail/SKILL.md` copy), invoke it at the level from `docs/taste.md` (`laziness: lite|full|ultra`, default `full`). Then apply §4 of this file (the aisdlc never-lazy list).
2. If not installed, apply §1-§3 below. Tell the user once per session: "official `ponytail` not installed; using aisdlc's embedded ladder. Install with `npx aisdlc-cli addon ponytail` for the maintained version."
3. Never install anything without asking.

## 1. The ladder (stop at the first rung that holds)

Run it **after** you understand the problem: read the task, trace the flow end to end, list every file the change touches. Then climb.

1. **Does this need to exist at all?** Speculative need = skip it and say so in one line (YAGNI).
2. **Already in this codebase?** A helper, util, type, pattern, table, or endpoint that already lives here → reuse it. Look before you write; re-implementing what is a few files over is the most common slop.
3. **Stdlib does it?** Use it.
4. **Native platform feature covers it?** `<input type="date">` over a picker library; CSS over JS; a DB constraint over app code; an HTTP cache header over a cache layer.
5. **Already-installed dependency solves it?** Use it. Never add a new one for what a few lines can do.
6. **Can it be one line?** One line.
7. **Only then:** the minimum code that works.

Two rungs work → take the higher one and move on. Two options of the same size → take the one that is correct on edge cases. Lazy means less code, not a flimsier algorithm.

**Bug fix = root cause, not symptom.** Before editing, grep every caller of the function you are about to touch. One guard in the shared function is a smaller diff than a guard in every caller, and patching only the path the ticket names leaves the siblings broken.

## 2. Rules

- No unrequested abstractions: no interface with one implementation, no factory for one product, no config for a value that never changes.
- No scaffolding "for later"; later can scaffold for itself.
- Deletion over addition. Boring over clever; clever is what someone decodes at 3am.
- Fewest files possible. Shortest working diff wins, once the problem is understood. The smallest change in the wrong place is a second bug.
- Complex request? Ship the lazy version and question the rest in the same reply: "Did X; Y covers it. Need full X? Say so." Never stall on a default you can take.
- Mark deliberate simplifications with a known ceiling using a `ponytail:` comment naming the ceiling and the upgrade path: `// ponytail: in-memory map; move to Redis if >1 instance`.
- Output: code first, then at most three short lines: what was skipped, when to add it. `[code] → skipped: [X], add when [Y].` If the explanation is longer than the code, delete the explanation.

## 3. Intensity

| level | behaviour |
|---|---|
| `lite` | Build what is asked; name the lazier alternative in one line. The human picks. |
| `full` (default) | Ladder enforced. Stdlib and native first. Shortest diff, shortest explanation. |
| `ultra` | YAGNI extremist. Deletion before addition. Ship the one-liner and challenge the rest of the requirement in the same breath. |

Set once in `docs/taste.md` (`laziness: full`). Override per turn with "ponytail lite/full/ultra". "stop ponytail" / "normal mode" reverts for the session.

## 4. aisdlc overlay: what you are never lazy about

Ponytail governs the *solution*. It never shrinks the *process* or the *reading*.

- **Understanding.** Trace the whole flow first. Laziness that skips comprehension ships a confident wrong fix.
- **The spec.** Every `#### Scenario:` still gets a test. YAGNI removes speculative *code*, never a signed requirement. Want less scope? That is `aisdlc-delta`, not a quiet omission.
- **Evidence.** Every claim still has an `evidence/*.json` behind it. Non-trivial logic (a branch, loop, parser, money or security path) leaves at least one runnable check; trivial one-liners need none.
- **Gates and approvals.** Never skipped, never simulated, never signed by you.
- **Trust boundaries.** Input validation, error handling that prevents data loss, auth, security headers, accessibility basics, and anything explicitly requested stay in. If the human insists on the full version, build it without re-arguing.
- **Secrets.** Placeholders only, always.
- **Reversibility.** Migrations stay expand/contract; flags still default off. A one-line irreversible migration is not lazy, it is a gamble.
- **Hardware and the physical world.** Leave the calibration knob.

## 5. Where it plugs into the flow

| stage | how |
|---|---|
| `aisdlc-brainstorm` / `aisdlc-plan` | Run the ladder over the candidate approaches. Record the rung in `plan.md` `## Decisions` ("rung 4: native `<dialog>`; alternatives: headless-ui modal"). |
| `aisdlc-implement` | Per task, before Green: climb the ladder. The minimum code that turns the test green is the target. |
| `aisdlc-review` | Add a third finding class, `over-built (advisory)`: abstractions with one caller, dependencies added for <20 lines of work, files that could be deleted. If the official skill is present, run `ponytail-review` on the diff. |
| `aisdlc-brownfield` | Prefer the strangler seam that touches the fewest legacy files. |
| `aisdlc-retro` | Count lines added vs. deleted and dependencies added; propose ladder rungs the team keeps skipping. |

The shortest path to done is the right path, and in aisdlc "done" still means evidence on disk.
