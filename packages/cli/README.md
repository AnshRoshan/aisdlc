# arsdlc

[![npm](https://img.shields.io/npm/v/arsdlc.svg)](https://www.npmjs.com/package/arsdlc)
[![downloads](https://img.shields.io/npm/dm/arsdlc.svg)](https://www.npmjs.com/package/arsdlc)
[![Node](https://img.shields.io/node/v/arsdlc)](https://github.com/AnshRoshan/arsdlc/blob/main/packages/cli/package.json)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**Agents write code. arsdlc runs the process.**

A harness-agnostic process kit for AI-assisted engineering: twenty [Agent Skills](https://agentskills.io) plus a zero-dependency CLI that keeps the truth on disk. Lanes (spike, quick, standard, regulated) match the amount of process to the stakes, so it works for a one-line bug fix and for a regulated payments change. Works with Claude Code, Codex CLI, Cursor, Antigravity CLI, GitHub Copilot, Devin Desktop, OpenCode and any agent that reads `AGENTS.md`; the retired `gemini-cli` and `windsurf` layouts still install and say so. Approvals bind to the artifact hash and to the commit you signed. Evidence exports as in-toto/DSSE and SARIF and verifies offline. Bring your own model and your own subscription; nothing leaves your machine.

```bash
npx arsdlc init            # installs skills + instructions into every harness it detects
```

or, skills only, via the open skills CLI:

```bash
npx skills add AnshRoshan/arsdlc
```

## What you get

| | |
|---|---|
| `skills/arsdlc-*` | Flow (router) · Brainstorm (lane + approaches) · Discover · Brownfield · Taste · Spec (EARS) · Plan · Tasks · Implement · Debug · Craft · Verify · Review · Quality · Release · Retro, plus Grill, Ponytail, Delta and Handoff |
| `arsdlc-grill` / `arsdlc-ponytail` | bridges to the official [grilling](https://github.com/mattpocock/skills) and [ponytail](https://github.com/DietrichGebert/ponytail) skills when installed (`arsdlc addon all`); embedded fallbacks otherwise |
| `arsdlc new --lane` / `arsdlc lane` | spike [G3] · quick [G2 G3 G4] · standard [G1-G6] · regulated [G1-G6, two approvers]; lanes only ratchet up |
| `arsdlc next` | derives the feature's state from files and tells the agent which skill to load |
| `arsdlc gate G1..G6` | Plan approval · Artifact consistency · Merge safety · Acceptance proof · Release approval · Runtime guardrails |
| `arsdlc evidence -- <cmd>` | runs a command and records exit code + output hash as an append-only artifact (no fake green) |
| `arsdlc approve` | human-only, segregation of duties enforced, hash-chained, invalidated when the artifact changes |
| `arsdlc scan` | secrets scanner over tracked and non-ignored files (9 detector families, placeholder-aware) |

## Ten-minute tour

```bash
npx arsdlc init
npx arsdlc new "Magic link login" --kind backend
npx arsdlc next                              # → SPECIFY, load arsdlc-spec
# ... agent writes spec.md; you sign §5 ...
npx arsdlc next                              # → PLAN (owner: human)
npx arsdlc approve G1 magic-link-login --by "Priya"
npx arsdlc next                              # → BUILD, next task T1, load arsdlc-implement
npx arsdlc evidence magic-link-login --label full -- npm test
npx arsdlc gates magic-link-login
```

## The eight invariants

1. The spec is the source of truth; intent changes go through deltas.
2. Gates are transitions with evidence, not suggestions.
3. Segregation of duties: approver ≠ author. Agents never approve.
4. Humans own the acceptance bar.
5. Done = a recorded run artifact.
6. Disk is state; chat is not.
7. Secrets never land in files.
8. Fail loud, never fake green.

## Commands

```
arsdlc init [--harness auto|all|claude-code,codex,cursor,gemini-cli,copilot,windsurf,opencode] [--link]
arsdlc doctor · arsdlc skills · arsdlc kinds · arsdlc addon [ponytail|grilling|code-craft|quality-tools|all] [--print]
arsdlc new "<title>" --kind <frontend|backend|mobile|data|ml|infra|docs|lib|other> [--lane spike|quick|standard|regulated]
arsdlc lane <feature> [lane]
arsdlc status [--json] · arsdlc next [feature] [--json]
arsdlc check spec <path|feature> · arsdlc check delta <path|feature> · arsdlc trace [feature]
arsdlc gate <G1..G6> [feature] · arsdlc gates [feature] · arsdlc scan
arsdlc evidence <feature> [--label full|green|red|baseline|smoke|spike|blocked|deploy] [--task T3] -- <command>
arsdlc approve <G1|G4|G5> <feature> --by "<human>" [--note ...]
arsdlc audit [feature]
```

Set `AISDLC_AGENT=1` in your agent's environment to make `approve` and lane downgrades refuse.

## Evidence and approval compatibility

New run records contain requested and executed argv, a checksum and a source fingerprint covering
uncommitted changes, deletions and Markdown output. Per-feature process artifacts and installed harness
skills are excluded. G3 and G4 reject stale/corrupt proof; each acceptance row must cite a green recorded
run and match a spec scenario. Historical records without checksums remain history, not gate evidence;
a fresh run restores proof without deleting history.

G1 approvals bind spec + plan, G4 spec + acceptance, and G5 spec + acceptance + rollout. Older hashes
become stale: humans re-review and re-approve, never rewrite the chain. Repeated names do not satisfy a
two-approver policy. `test.gate: none-by-design` requires a non-placeholder `test.reason`.

Windows package-manager shims are invoked through their Node entry points without shell interpolation;
unsupported wrappers fail loudly. Specify an explicit shell executable only when shell semantics are
intended. Extra files in copied skill directories are preserved; `--link` creates real symlinks on
Windows when the system allows it (Developer Mode or admin rights) and falls back to junctions when it
does not, printing the shape it used.

Checksums and names are not cryptographic identity. Local writers can recompute hashes; the guard is
heuristic/fail-open, and detector patterns cannot find every secret. Human review and repository access
controls remain necessary. This tarball is published without provenance: `npm audit signatures` shows
nothing for it, so compare `arsdlc --version` against the [CHANGELOG](https://github.com/AnshRoshan/arsdlc/blob/main/CHANGELOG.md)
and the matching git tag until the CI trusted-publisher path lands.

## Layout it creates

```
init    arsdlc.json · AGENTS.md / CLAUDE.md / GEMINI.md / .cursor/rules · .agents/skills + per-harness
        skill dirs · docs/constitution.md · docs/taste.md
        (Claude Code only: .claude/agents/arsdlc-scout.md and arsdlc-researcher.md)
new     docs/features/<slug>/{feature.json, spec.md, plan.md, tasks.md, acceptance.md, rollout.md,
        guardrails.yaml, runbook.md, evidence/, approvals.json, deltas/}
later   docs/brief.md, docs/glossary.md, docs/decisions/ and, inside a feature folder, deltas/*.md,
        handoff.md, retro.md, evals.md - each written by the skill that owns it, never seeded empty
```

MIT. Part of the [arsdlc monorepo](https://github.com/AnshRoshan/arsdlc) - the site is at
[anshroshan.github.io/arsdlc](https://anshroshan.github.io/arsdlc/), issues at
[AnshRoshan/arsdlc/issues](https://github.com/AnshRoshan/arsdlc/issues).
