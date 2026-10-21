# aisdlc

**Agents write code. aisdlc runs the process.**

A harness-agnostic process kit for AI-assisted engineering: twenty [Agent Skills](https://agentskills.io) plus a zero-dependency CLI that keeps the truth on disk. Lanes (spike, quick, standard, regulated) match the amount of process to the stakes, so it works for a one-line bug fix and for a regulated payments change. Works with Claude Code, Codex CLI, Cursor, Antigravity CLI, GitHub Copilot, Devin Desktop, OpenCode and any agent that reads `AGENTS.md`; the retired `gemini-cli` and `windsurf` layouts still install and say so. Approvals bind to the artifact hash and to the commit you signed. Evidence exports as in-toto/DSSE and SARIF and verifies offline. Bring your own model and your own subscription; nothing leaves your machine.

```bash
npx @anshroshan/aisdlc init            # installs skills + instructions into every harness it detects
```

or, skills only, via the open skills CLI:

```bash
npx skills add AnshRoshan/aisdlc
```

## What you get

| | |
|---|---|
| `skills/aisdlc-*` | Flow (router) · Brainstorm (lane + approaches) · Discover · Brownfield · Taste · Spec (EARS) · Plan · Tasks · Implement · Debug · Craft · Verify · Review · Quality · Release · Retro, plus Grill, Ponytail, Delta and Handoff |
| `aisdlc-grill` / `aisdlc-ponytail` | bridges to the official [grilling](https://github.com/mattpocock/skills) and [ponytail](https://github.com/DietrichGebert/ponytail) skills when installed (`aisdlc addon all`); embedded fallbacks otherwise |
| `aisdlc new --lane` / `aisdlc lane` | spike [G3] · quick [G2 G3 G4] · standard [G1-G6] · regulated [G1-G6, two approvers]; lanes only ratchet up |
| `aisdlc next` | derives the feature's state from files and tells the agent which skill to load |
| `aisdlc gate G1..G6` | Plan approval · Artifact consistency · Merge safety · Acceptance proof · Release approval · Runtime guardrails |
| `aisdlc evidence -- <cmd>` | runs a command and records exit code + output hash as an append-only artifact (no fake green) |
| `aisdlc approve` | human-only, segregation of duties enforced, hash-chained, invalidated when the artifact changes |
| `aisdlc scan` | secrets scanner over tracked and non-ignored files (9 detector families, placeholder-aware) |

## Ten-minute tour

```bash
npx @anshroshan/aisdlc init
npx @anshroshan/aisdlc new "Magic link login" --kind backend
npx @anshroshan/aisdlc next                              # → SPECIFY, load aisdlc-spec
# ... agent writes spec.md; you sign §5 ...
npx @anshroshan/aisdlc next                              # → PLAN (owner: human)
npx @anshroshan/aisdlc approve G1 magic-link-login --by "Priya"
npx @anshroshan/aisdlc next                              # → BUILD, next task T1, load aisdlc-implement
npx @anshroshan/aisdlc evidence magic-link-login --label full -- npm test
npx @anshroshan/aisdlc gates magic-link-login
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
aisdlc doctor · aisdlc skills · aisdlc kinds · aisdlc addon [ponytail|grilling|code-craft|quality-tools|all] [--print]
aisdlc new "<title>" --kind <frontend|backend|mobile|data|ml|infra|docs|lib|other> [--lane spike|quick|standard|regulated]
aisdlc lane <feature> [lane]
aisdlc status [--json] · aisdlc next [feature] [--json]
aisdlc check spec <path|feature> · aisdlc check delta <path|feature> · aisdlc trace [feature]
aisdlc gate <G1..G6> [feature] · aisdlc gates [feature] · aisdlc scan
aisdlc evidence <feature> [--label full|green|red|baseline|smoke|spike|blocked|deploy] [--task T3] -- <command>
aisdlc approve <G1|G4|G5> <feature> --by "<human>" [--note ...]
aisdlc audit [feature]
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
controls remain necessary. Until registry publication is verified, use the clone's Node entry point.

## Layout it creates

```
init    aisdlc.json · AGENTS.md / CLAUDE.md / GEMINI.md / .cursor/rules · .agents/skills + per-harness
        skill dirs · docs/constitution.md · docs/taste.md
        (Claude Code only: .claude/agents/aisdlc-scout.md and aisdlc-researcher.md)
new     docs/features/<slug>/{feature.json, spec.md, plan.md, tasks.md, acceptance.md, rollout.md,
        guardrails.yaml, runbook.md, evidence/, approvals.json, deltas/}
later   docs/brief.md, docs/glossary.md, docs/decisions/ and, inside a feature folder, deltas/*.md,
        handoff.md, retro.md, evals.md - each written by the skill that owns it, never seeded empty
```

MIT. Part of the [aisdlc monorepo](https://github.com/AnshRoshan/aisdlc).
