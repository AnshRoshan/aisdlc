# aisdlc

**Agents write code. aisdlc runs the process.**

A harness-agnostic process kit for AI-assisted engineering: eighteen [Agent Skills](https://agentskills.io) plus a zero-dependency CLI that keeps the truth on disk. Lanes (spike, quick, standard, regulated) match the amount of process to the stakes, so it works for a one-line bug fix and for a regulated payments change. Works with Claude Code, Codex CLI, Cursor, Gemini CLI, GitHub Copilot, Windsurf, OpenCode and any agent that reads `AGENTS.md`. Bring your own model and your own subscription; nothing leaves your machine.

```bash
npx aisdlc-cli init            # installs skills + instructions into every harness it detects
```

or, skills only, via the open skills CLI:

```bash
npx skills add AnshRoshan/aisdlc
```

## What you get

| | |
|---|---|
| `skills/aisdlc-*` | Flow (router) · Brainstorm (lane + approaches) · Discover · Brownfield · Taste · Spec (EARS) · Plan · Tasks · Implement · Debug · Verify · Review · Release · Retro, plus Grill, Ponytail, Delta and Handoff |
| `aisdlc-grill` / `aisdlc-ponytail` | bridges to the official [grilling](https://github.com/mattpocock/skills) and [ponytail](https://github.com/DietrichGebert/ponytail) skills when installed (`aisdlc addon all`); embedded fallbacks otherwise |
| `aisdlc new --lane` / `aisdlc lane` | spike [G3] · quick [G2 G3 G4] · standard [G1-G6] · regulated [G1-G6, two approvers]; lanes only ratchet up |
| `aisdlc next` | derives the feature's state from files and tells the agent which skill to load |
| `aisdlc gate G1..G6` | Plan approval · Artifact consistency · Merge safety · Acceptance proof · Release approval · Runtime guardrails |
| `aisdlc evidence -- <cmd>` | runs a command and records exit code + output hash as an append-only artifact (no fake green) |
| `aisdlc approve` | human-only, segregation of duties enforced, hash-chained, invalidated when the artifact changes |
| `aisdlc scan` | secrets scanner over tracked files (8 families, placeholder-aware) |

## Ten-minute tour

```bash
npx aisdlc-cli init
npx aisdlc-cli new "Magic link login" --kind backend
npx aisdlc-cli next                              # → SPECIFY, load aisdlc-spec
# ... agent writes spec.md; you sign §5 ...
npx aisdlc-cli next                              # → PLAN (owner: human)
npx aisdlc-cli approve G1 magic-link-login --by "Priya"
npx aisdlc-cli next                              # → BUILD, next task T1, load aisdlc-implement
npx aisdlc-cli evidence magic-link-login --label full -- npm test
npx aisdlc-cli gates magic-link-login
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
aisdlc init [--harness auto|all|claude-code,codex,cursor,gemini-cli,copilot,windsurf,opencode] [--link]
aisdlc doctor · aisdlc skills · aisdlc addon [ponytail|grilling|all] [--print]
aisdlc new "<title>" --kind <frontend|backend|mobile|data|ml|infra|docs|lib|other> [--lane spike|quick|standard|regulated]
aisdlc lane <feature> [lane]
aisdlc status [--json] · aisdlc next [feature] [--json]
aisdlc check spec <path|feature> · aisdlc trace [feature]
aisdlc gate <G1..G6> [feature] · aisdlc gates [feature] · aisdlc scan
aisdlc evidence <feature> [--label full|green|red|blocked|deploy] [--task T3] -- <command>
aisdlc approve <G1|G4|G5> <feature> --by "<human>" [--note ...]
aisdlc audit [feature]
```

Set `AISDLC_AGENT=1` in your agent's environment to make `approve` refuse outright.

## Layout it creates

```
aisdlc.json · AGENTS.md / CLAUDE.md / GEMINI.md / .cursor/rules · .agents/skills + per-harness skill dirs
docs/constitution.md · docs/taste.md · docs/brief.md
docs/constitution.md · docs/taste.md · docs/glossary.md · docs/brief.md · docs/decisions/
docs/features/<slug>/{feature.json (kind, lane), spec.md, plan.md, tasks.md, acceptance.md, rollout.md,
                      guardrails.yaml, runbook.md, evidence/, approvals.json, deltas/, handoff.md, retro.md}
```

MIT. Part of the [aisdlc monorepo](https://github.com/AnshRoshan/aisdlc).
