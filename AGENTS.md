# AGENTS.md

Master instruction file for anyone working on aisdlc. Read this first, in every session, in every tool.

## What this repo is

aisdlc is an MIT process kit for AI-assisted engineering: 20 Agent Skills plus a zero-dependency Node CLI that turns a spec into gated, evidenced work. The corpus and the CLI are the product; the site is documentation. Users install it into their own repo; this repo dogfoods the same process on itself.

## Reading order (tiered, never preload everything)

Always read before any work:

1. `context/overview.md`
2. `context/workflow-rules.md`
3. `context/progress-tracker.md`
4. `memory.md`
5. `docs/constitution.md`, `docs/conventions.md`, `docs/taste.md`

Read when the task touches it:

- `docs/features/<slug>/spec.md` and `tasks.md`: the unit being built. This is the per-change source of truth.
- `context/code-standards.md`: before writing code.
- `context/architecture.md` and `context/library-docs.md`: before touching that subsystem or external format.
- `context/decisions.md`: before making or repeating a decision.
- `context/build-plan.md`: when sequencing work or adding scope.
- `docs/COMPETITORS.md` section 10 and `docs/RESEARCH.md` section 12: before market or positioning work.

## Project facts

- CLI: Node >=18, ESM, zero runtime dependencies. Site: Node >=22.12 (Astro 7).
- Test: `npm --prefix packages/cli test`
- Corpus check: `node packages/cli/scripts/check-skills.mjs`
- Sync canonical skills: `node packages/cli/scripts/sync-skills.mjs` (never hand-edit `packages/cli/skills/`)
- Site build: `cd site && npm ci && npm run build`
- Plugin check: `claude plugin validate .`
- CLI entry: `node packages/cli/bin/aisdlc.js --help`
- Feature artifacts: `docs/features/<slug>/`; project marker: `aisdlc.json`
- Windows is a first-class target. No POSIX-only shell glue, no shell-concatenated argv.

## Invariants

From `docs/constitution.md`, non-negotiable:

1. The spec is the source of truth; intent changes go through deltas.
2. Gates are transitions, not suggestions.
3. The approver is never the author or the prompter.
4. Humans sign the acceptance bar.
5. Done means a recorded run.
6. Disk is state; chat is not.
7. Secrets never land in files.
8. Fail loud, never fake green.
9. Process matches stakes; lanes only ratchet up.
10. The least code that passes the spec wins; no dependency without a decision record.

Repo-specific:

- Every command documented in a skill, doc, page or README must exist in `packages/cli/src/cli.js`.
- Engine gates are pure functions over files. Same files, same answer, any machine.
- Evidence and approvals are written by the CLI, never by hand. Never fill an `Approved-by:` line and never run `aisdlc approve`.
- Never edit generated copies: `packages/cli/skills/`, `packages/cli/agents/`, `site/dist/`.
- A claim that cannot be checked is not a feature. Cite the test, the gate or the command.

## Workflow

- Dogfood aisdlc: `node packages/cli/bin/aisdlc.js next <feature>` and obey its output over chat history.
- One feature or system boundary at a time. New ideas go into `context/build-plan.md`, never silently into code.
- Record while working: `context/progress-tracker.md` when starting and finishing; `context/decisions.md` for hard calls; `context/current-issues.md` for bugs; `memory.md` at session end.
- Before implementing, cross-check spec, plan and tasks read-only. Fix the artifacts, not the code.
- If docs and code disagree, flag the conflict to the human. Never silently overwrite either.

## Skills

The 20 skills are in `skills/`. Load the one `next` names; `aisdlc-flow` when unsure. Use `aisdlc-grill` for decisions, `aisdlc-ponytail` for the minimal implementation, and `aisdlc-review` for a two-axis review before asking for G4.

## Verification

Before declaring any unit done: run the tests, the corpus check, the site build, `claude plugin validate .`, and the spec's smoke path. Report the exact commands and results. Green tests do not prove feature correctness; drive the CLI.
