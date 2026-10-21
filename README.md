<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/hero-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="assets/hero-light.svg">
  <img src="assets/hero-dark.svg" alt="arsdlc: agents write code, arsdlc runs the process. The nine-state pipeline with build highlighted." width="100%">
</picture>

<br>

[![npm](https://img.shields.io/npm/v/arsdlc.svg)](https://www.npmjs.com/package/arsdlc)
[![CI](https://github.com/AnshRoshan/arsdlc/actions/workflows/ci.yml/badge.svg)](https://github.com/AnshRoshan/arsdlc/actions/workflows/ci.yml)
[![skills](https://img.shields.io/badge/agent_skills-20-b1e57c)](#the-20-skills)
[![Node](https://img.shields.io/node/v/arsdlc)](packages/cli/package.json)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A process kit for AI-assisted engineering that installs into any coding agent.
EARS specs, six evidence gates, hash-bound approval records, and a checksummed evidence log
that prose alone cannot satisfy. Local-first: no server, no account, no telemetry.
Local files and identity fields are trusted inputs, not an adversarial security boundary.

</div>

<br>

## Install

<table>
<tr>
<th width="33%" align="left"><sub>CLAUDE CODE PLUGIN</sub></th>
<th width="33%" align="left"><sub>SKILLS.SH · SKILLS ONLY</sub></th>
<th width="33%" align="left"><sub>NPM · CLI + SKILLS</sub></th>
</tr>
<tr>
<td valign="top">

```
/plugin marketplace add AnshRoshan/arsdlc
/plugin install arsdlc@arsdlc
```

20 skills, the guard mod, and the `/arsdlc-next`, `/arsdlc-status` and `/arsdlc-report` commands, updated through the plugin system.

</td>
<td valign="top">

```bash
npx skills add AnshRoshan/arsdlc
```

The skills only, symlinked into every harness it finds. One skill: `--skill arsdlc-debug`.

</td>
<td valign="top">

```bash
npx arsdlc init
```

The live package on npm (zero runtime dependencies, Node 18+). Installs skills, instructions,
slash commands **and** the read-only subagents, detected for your harness. `npm audit signatures`
tells you whether the version you pulled came from CI or from a laptop; the CI trusted-publisher
setting is the last thing standing between this name and provenance.

</td>
</tr>
</table>

`arsdlc init` detects **Claude Code, Codex CLI, Cursor, Antigravity CLI, GitHub Copilot, Devin Desktop and OpenCode** (plus the legacy `gemini-cli` and `windsurf` layouts, which still install and print a retirement notice), writes the canonical copy to `.agents/skills/`, per-harness copies (or symlinks with `--link`), the process tree in `docs/`, and an `arsdlc.json` marker.

The package has **zero runtime dependencies and no install-time hooks**; `gitHead` pins the tarball to a
public commit and [packages/cli/README.md](packages/cli/README.md#verifying-what-you-installed) gives the
loop that compares all 38 files against the tag. Then talk to your agent:

```bash
use arsdlc-brainstorm, I want to build payment retries
```

> It classifies the work into a lane, interviews you with recommended answers, and routes to the right skill. Every stage ends with `npx arsdlc next`, and the agent obeys the disk, not the chat.

## Where to start

| you have | start here |
|---|---|
| a new idea, nothing written yet | `arsdlc-brainstorm` → it picks the lane, then routes to `arsdlc-discover` → `arsdlc-spec` |
| an existing codebase you must not break | `arsdlc-brownfield` first: baseline, characterization tests, named seams, then the normal spine |
| one bounded change or a bug | `arsdlc new "…" --lane quick`, then `arsdlc-flow`; `arsdlc-debug` when it misbehaves |
| a spec that changed after signature | `arsdlc-delta` - never a quiet edit; approvals go stale on purpose |
| no idea where a feature actually is | `arsdlc next <feature>` (or `arsdlc-flow`, which reads the same disk) |

## Why

<table>
<tr><th width="30%" align="left">You have probably heard</th><th width="35%" align="left">What actually happened</th><th width="35%" align="left">What arsdlc does</th></tr>
<tr><td>"All tests pass."</td><td>Nothing ran. The agent wrote the sentence it predicted you wanted.</td><td>Only counts a run it recorded itself: command, exit code, output hash.</td></tr>
<tr><td>The spec drifted at 2 a.m.</td><td>A requirement was quietly rewritten to match the code.</td><td>Turns the edit into a delta, invalidates stale approvals, moves state backwards on purpose.</td></tr>
<tr><td>The agent approved its own plan.</td><td>Segregation of duties is a policy nobody enforces on a Friday.</td><td>Refuses approvals from the author, and refuses agents entirely.</td></tr>
<tr><td>The review agreed with the code.</td><td>The model that wrote it reviewed it, saw its own reasoning, and called it clean.</td><td>G4 records the author model and the reviewer model, and fails a match. No second family available means saying `degraded`, out loud, in the artifact.</td></tr>
</table>

## The gate model

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/flow-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="assets/flow-light.svg">
  <img src="assets/flow-dark.svg" alt="Nine states (discover, spec, plan, tasks, build, verify, accept, release, operate) with gates G1-G6 hanging over their transitions." width="100%">
</picture>

The agent runs `npx arsdlc next`, gets the state and the skill to load, does the work, and runs it again. Humans are asked for exactly two things: **signatures and approvals**. Every check is a pure function over files (`packages/cli/src/engine.js`): same files, same answer, any machine. That is what makes it auditable.

### Hard mode: the Claude Code mod

Comes with the plugin install, nothing to enable. The CLI is the referee, but a referee only sees what
gets reported to it. `hooks/arsdlc-guard.mjs` is a
Claude Code [mod](https://code.claude.com/docs/en/plugins/mods/overview) - code that runs inside the
agent's process - and it closes the three holes that cost the most:

| it holds | because |
|---|---|
| a bare `npm test` / `pytest` / `cargo test` while a feature is open | the run records nothing; re-run it as `arsdlc evidence <feature> --label full -- …` (invariant 5) |
| any `arsdlc approve` the agent tries to run | approvals are human actions, refused before the call rather than after (invariants 3 and 4) |
| an edit to a signed `spec.md`, or a hand-written `Approved-by:` line | intent changes go through a delta; the signature is yours (invariants 1 and 4) |
| a write to `evidence/` or `approvals.json` | those are the files the gates trust; a hand-made one is a forged one |
| an answer that says the suite passed | if no run is recorded, or the newest one predates the last code change, the log line says so in front of you (invariant 5) |

It also reads `arsdlc next` once per turn and puts the real state in front of the model *and* in your
status line, so "where are we" has an answer you did not have to ask for. Everything else stays the
portable contract: the mod is an accelerator for one harness, it fails open when it cannot decide, and
the other six harnesses lose nothing but the interception.

<details open>
<summary><strong>Lanes: how much process a feature carries</strong> (set by <code>arsdlc-brainstorm</code>, ratchets only up)</summary>
<br>

| lane | required gates | spec signature | typical |
|---|---|---|---|
| `spike` | G3 | not required | feasibility question; output is an answer |
| `quick` | G2, G3, G4 | required | bounded change to an existing flow; bug fix |
| `standard` | G1–G6 | required | new capability |
| `regulated` | G1–G6, two approvers | required | money, PII, auth, irreversible data, public contracts |

</details>

<details>
<summary><strong>The eight invariants</strong> (written to <code>docs/constitution.md</code> and your agent's instructions file on <code>init</code>)</summary>
<br>

1. **The spec is the source of truth.** Code is generated output. Intent changes go through a delta, never a quiet edit.
2. **Gates are transitions, not suggestions.** No evidence, no progress.
3. **Approver is never the author**, and agents cannot approve at all.
4. **Humans own the acceptance bar.** `Approved-by:` lines are human-signed.
5. **Done means a recorded run** in `evidence/`. Claims without artifacts do not count.
6. **Disk is state, chat is not.** Same files, same answer, any machine, any model.
7. **Secrets never land in files.** Placeholders only. Fail closed.
8. **Fail loud, never fake green.** Infra down means `IMPLEMENTED-NOT-VERIFIED`, not PASS.

</details>

## Who writes what

State lives in files, so *who may touch each file* is the part that decides whether a project
survives many sessions and many agents. One owner per artifact; `evidence/` and `approvals.json` are
written by the CLI and by nobody else, which is what makes them evidence rather than prose.

| artifact | written by | read by | who may change it |
|---|---|---|---|
| `arsdlc.json` | `arsdlc init` | every CLI command | you: policy, harnesses, `test.gate` |
| `docs/constitution.md` | init, then `arsdlc-retro` | every stage | amendment a human agrees to |
| `docs/taste.md` | `arsdlc-taste` | plan, implement, review | you; retro proposes edits |
| `docs/brief.md` | `arsdlc-discover` | brainstorm, spec, retro | a new discovery run, not an edit |
| `docs/glossary.md` | discover or taste, then anyone who meets a new term | spec, plan, tasks, review | additive, one line per term |
| `docs/decisions/*.md` | `arsdlc-plan` for cross-feature calls | plan, review | supersedes with a new ADR; never rewritten |
| `spec.md` | `arsdlc-spec` | plan, tasks, implement, verify, review | **only** through `arsdlc-delta` once signed |
| `plan.md` | `arsdlc-plan` | tasks, implement | author until G1; an edit after G1 makes the approval stale on purpose |
| `tasks.md` | `arsdlc-tasks` | implement, verify | `arsdlc-implement` checks boxes; only tasks/plan adds or reorders them |
| `acceptance.md` | `arsdlc-review` | verify, release, the human | reviewer fills rows, **only a human signs** |
| `rollout.md`, `guardrails.yaml`, `runbook.md` | `arsdlc-release` | operate, retro | before G5/G6; after, through a delta |
| `deltas/*.md` | `arsdlc-delta` | spec, plan, tasks | author writes, human decides |
| `evidence/*.json` | the CLI, from a run it spawned | `next`, G3, G4, review | nobody. Appending-only; an edited run is a forged run |
| `approvals.json` | the CLI, from `arsdlc approve` | every gate | nobody. The hash chain reports the edit |
| `handoff.md` | `arsdlc-handoff` | `arsdlc-flow` on the next start | the next handoff replaces it |
| `retro.md` | `arsdlc-retro` | the next feature's discovery | you |

## Verification contract and limits

- `next` reads disk, not chat. G3 needs a current-source recorded run; G4 requires a real green run
  for every acceptance row, complete spec-scenario coverage and a recorded independent or explicitly
  degraded review. Neither a green exit nor a scenario name proves test quality: humans still review it.
- Approval counts use distinct normalized names, excluding the author. G1 binds spec + plan, G4
  spec + acceptance, and G5 spec + acceptance + rollout. Old-format approvals become stale and need
  human re-review; never rewrite their history. Regulated acceptance requires two approval records.
- New evidence has a record checksum, exact requested/executed argv, source fingerprint and a flag
  for source changed during the run. Legacy evidence remains readable history but cannot earn a gate;
  record a new run. A `none-by-design` test waiver needs a non-placeholder `test.reason` in config.
- The CLI refuses approval and lane downgrades when `AISDLC_AGENT` is set. Names, environment and local
  files are **trusted inputs**: the chain is not an authenticated identity system. Someone with write
  access can rewrite records and recompute hashes. Protect the repository with your normal controls.
- The Claude guard is heuristic and fail-open, not a sandbox. For an agreed delta, the human clears
  the old spec signature in their own editor before the agent applies the change; no Bash bypass.
- Secret detection is pattern-based, not exhaustive. Common credential flags and recognized output
  secrets are rejected/redacted, but use environment variables and never persist raw sensitive logs.
- No account, server or telemetry is added. Explicit addon installation and commands you choose to
  record can access the network; arsdlc cannot promise those third-party commands are local-only.

## The 20 skills

<table>
<tr>
<th width="33%" align="left"><sub>ENTRY</sub></th>
<th width="33%" align="left"><sub>SPECIFY → BUILD</sub></th>
<th width="33%" align="left"><sub>VERIFY → SHIP</sub></th>
</tr>
<tr>
<td valign="top">

- [`arsdlc-flow`](skills/arsdlc-flow/SKILL.md) — the router
- [`arsdlc-brainstorm`](skills/arsdlc-brainstorm/SKILL.md)
- [`arsdlc-discover`](skills/arsdlc-discover/SKILL.md)
- [`arsdlc-brownfield`](skills/arsdlc-brownfield/SKILL.md)
- [`arsdlc-taste`](skills/arsdlc-taste/SKILL.md)
- [`arsdlc-spec`](skills/arsdlc-spec/SKILL.md)

</td>
<td valign="top">

- [`arsdlc-plan`](skills/arsdlc-plan/SKILL.md)
- [`arsdlc-tasks`](skills/arsdlc-tasks/SKILL.md)
- [`arsdlc-implement`](skills/arsdlc-implement/SKILL.md)
- [`arsdlc-debug`](skills/arsdlc-debug/SKILL.md)
- [`arsdlc-craft`](skills/arsdlc-craft/SKILL.md)
- [`arsdlc-verify`](skills/arsdlc-verify/SKILL.md)
- [`arsdlc-review`](skills/arsdlc-review/SKILL.md)
- [`arsdlc-quality`](skills/arsdlc-quality/SKILL.md)

</td>
<td valign="top">

- [`arsdlc-release`](skills/arsdlc-release/SKILL.md)
- [`arsdlc-retro`](skills/arsdlc-retro/SKILL.md)
- [`arsdlc-grill`](skills/arsdlc-grill/SKILL.md)
- [`arsdlc-ponytail`](skills/arsdlc-ponytail/SKILL.md)
- [`arsdlc-delta`](skills/arsdlc-delta/SKILL.md)
- [`arsdlc-handoff`](skills/arsdlc-handoff/SKILL.md)

</td>
</tr>
</table>

Plain Markdown in the open Agent Skills format, read identically by every harness above. Bridges to four maintained third-party skills — [ponytail](https://github.com/DietrichGebert/ponytail), [grilling](https://github.com/mattpocock/skills), and the two from [ansh-other-skills](https://github.com/AnshRoshan/ansh-other-skills) (code-craft, code-quality-tools) — using the official ones when installed and an embedded fallback otherwise. `npx arsdlc addon all` installs them; works without them.

## Repo layout

| path | what |
|---|---|
| [`skills/`](skills/) | the 20 canonical skills (source of truth) |
| [`agents/`](agents/) | two read-only subagent definitions `init` installs for Claude Code |
| [`packages/cli/`](packages/cli/) | zero-dependency Node CLI (Node ≥ 18); `node packages/cli/bin/arsdlc.js` until it is on npm |
| [`commands/`](commands/) | Claude Code plugin slash commands (`/arsdlc-next`, `/arsdlc-status`) |
| [`hooks/`](hooks/) | the `arsdlc-guard` Claude Code mod; it ships with the plugin install |
| [`.claude-plugin/`](.claude-plugin/) | plugin manifest + marketplace listing |
| [`site/`](site/) | Astro static site; the deploy workflow runs, Pages itself is not enabled yet |
| [`docs/conventions.md`](docs/conventions.md) | how a skill is written: what earns a line, when to split a file, the budgets |
| [`docs/RESEARCH.md`](docs/RESEARCH.md) | design decisions and their sources (Spec Kit, BMAD, superpowers, ponytail, grilling) |
| [`docs/COMPETITORS.md`](docs/COMPETITORS.md) | raw research notes on the six competing process kits (read-only; cited by RESEARCH §7-§9) |

<details>
<summary><strong>CLI reference</strong></summary>
<br>

```
arsdlc init      skills + instructions + slash commands + subagents, detected for your harness
arsdlc doctor    what is installed where, which companions, which test gate
arsdlc skills    list the bundled skills
arsdlc kinds     kind verify models and lane gate sets
arsdlc new       open a feature with a kind and a lane
arsdlc lane      show or raise a feature's lane (a downgrade needs --force --note)
arsdlc status    every feature and its state
arsdlc next      derive state from disk: blockers, next task, the skill to load
arsdlc check     spec (EARS) or a delta file
arsdlc trace     requirement → task matrix
arsdlc gate      one of G1-G6  ·  arsdlc gates runs all six
arsdlc scan      secrets over tracked files
arsdlc report    read the logs back: runs, pass rate, staleness, stale approvals, review state
arsdlc ci        every gate the work has crossed, plus staleness and tree drift; non-zero on a regression
arsdlc evidence  run a command and record the run as evidence
arsdlc approve   human gate approval (G1, G4, G5); refuses agents and refuses the author
arsdlc audit     approval chain + evidence log
arsdlc export    in-toto Statement v1 + DSSE envelope + SARIF, and `--verify` recomputes it offline
arsdlc mcp       read-only state over stdio (arsdlc_next, arsdlc_status); writes are not exposed
```

</details>

## FAQ

<details>
<summary><strong>Is this a SaaS? Do I need an account?</strong></summary>
<br>
No. It is a folder of SKILL.md files and a zero-dependency Node CLI. Everything runs on your machine against your own repo.
</details>

<details>
<summary><strong>Which model or subscription do I need?</strong></summary>
<br>
Whatever you already have. The skills are plain Markdown; Claude Code, Codex, Cursor, Gemini, Copilot, Windsurf, OpenCode and local open-weight models all read them the same way.
</details>

<details>
<summary><strong>How is this different from Spec Kit or BMAD?</strong></summary>
<br>
Those give you excellent templates and advice. arsdlc adds enforcement: approvals bound to artifact hashes that go stale when you edit, recorded evidence that prose alone cannot satisfy, and separation-of-duties checks over trusted local identity fields.
</details>

<details>
<summary><strong>Can I use it on an existing codebase?</strong></summary>
<br>
Yes, <code>arsdlc-brownfield</code>: baseline, characterization tests and named seams before any delta-only change is allowed.
</details>

<details>
<summary><strong>Does it combine with an AGENTS.md / context/ state system?</strong></summary>
<br>
Yes — they are different layers. arsdlc runs the <em>per-change</em> pipeline (EARS spec → plan → gates → evidence → approval); the <a href="https://github.com/AnshRoshan/project-context-system">project-context-system</a> skill maintains the <em>per-project</em> state (AGENTS.md, <code>context/</code> with architecture, build plan, decisions log, progress tracker, memory.md handoff). arsdlc reads the project's AGENTS.md and context files as constraints. When both are installed, one rule holds: spec artifacts stay owned by the arsdlc gates, decisions land in <code>context/decisions.md</code>, and no parallel spec tree is created.
</details>

<details>
<summary><strong>Is it free?</strong></summary>
<br>
MIT. Fork it, vendor it, ship it inside your company. If you find it useful, star the repo and file issues.
</details>

<details>
<summary><strong>What does this cost my agent in context?</strong></summary>
<br>
A skill loads in full whenever the run takes that branch, so every line is a recurring cost. Most
skills are one file because splitting short, common content costs more in missed reads than it saves in
tokens; the two rare branches that were genuinely long moved to `references/` (`arsdlc-flow`,
`arsdlc-review`). <code>node packages/cli/scripts/check-skills.mjs</code> prints the bytes a real run
loads per path and fails the build when a path or a file goes over budget, so the number is watched
rather than promised.
</details>

<details>
<summary><strong>Why should I believe the README about the CLI?</strong></summary>
<br>
You should not, on sight - which is why the corpus is checked. <code>check-skills.mjs</code> reads every
skill, doc and page against <code>packages/cli/src/cli.js</code>: a documented command must exist, an
<code>arsdlc-*</code> token must name a real skill or subagent, a referenced sub-file must be on disk, a
relative link must resolve, frontmatter must be uniform. It runs in CI. The phantom
<code>arsdlc verify</code> this README shipped with - advertised, never implemented - is exactly the
defect class it kills.
</details>

---

<div align="center">

**Contributing** · see [CONTRIBUTING.md](CONTRIBUTING.md): skills are prose, the CLI is law. Behaviour goes in a SKILL.md; anything that must be enforced deterministically goes in `packages/cli/src/engine.js` as a pure function over files. Skill authoring rules and the budgets that enforce them: [docs/conventions.md](docs/conventions.md).

**[MIT](LICENSE)** © Ansh Roshan · [docs](docs/) · [CHANGELOG](CHANGELOG.md)

</div>
