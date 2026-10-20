# Project Overview

## What this is

aisdlc is an MIT process kit for AI-assisted engineering. It combines 20 Agent Skills with a zero-dependency Node CLI so that a feature moves through spec, plan, tasks, implementation, verification, review, release and operation with recorded evidence and human approvals. The kit is local-first: no server, no account, no telemetry. The CLI derives state from files; the skills tell the agent what to do next.

## Who it's for

- Developers already using an AI coding harness (Claude Code, Codex, Cursor, Antigravity, Copilot, Devin Desktop, OpenCode) who are tired of agents claiming success without proof.
- Maintainers and contributors who edit the skill corpus or the CLI.
- Regulated and multi-model teams that need segregation of duties and an exportable audit trail, not another SaaS control plane.

## Core flows

1. **Install**: `aisdlc init --harness ...` writes skills, commands and agents into the harness layout; alternatives are the Claude plugin marketplace and the `skills` CLI.
2. **Start**: `aisdlc new "<title>" --kind ... --lane ...` creates `docs/features/<slug>/` with the artifact set.
3. **Specify and plan**: discovery or spec, then a plan; G1 requires a human signature on the plan.
4. **Build**: tasks with seams and `after:` edges; one task at a time; every run recorded with `aisdlc evidence`.
5. **Verify and accept**: G3 checks merge safety, then an independent review fills acceptance and a human signs G4.
6. **Release and operate**: G5 approves rollout and rollback; G6 checks runtime guardrails and the runbook.
7. **Learn**: `aisdlc report` reads the logs back; `aisdlc-retro` turns lessons into edits to the constitution, taste or a skill.

Lanes decide the gate set: `spike` (G3), `quick` (G2-G4), `standard` (G1-G6), `regulated` (G1-G6, two approvers). Lanes only ratchet up.

## Complex patterns and what could go wrong

- **State derivation**: `next` must agree with the files, never with chat. A parser that accepts a placeholder is a fake gate.
- **Hash binding**: approvals bind to artifact hashes; editing a signed artifact must make the approval stale. The current gap is that commits and trees are not bound.
- **Segregation of duties**: author, reviewer and approver are different identities. Self-approval and same-family review must fail.
- **Evidence**: a recorded command, argv, exit code and source fingerprint. A sentence in chat is not evidence.
- **Multi-harness install**: one corpus, several layouts, no build step, Windows included.
- **Corpus as product**: every documented command and skill token must resolve, or the docs lie.
- **Zero dependencies**: the CLI must run from `npx` with no install tree; optional integrations are external binaries, not bundled packages.

## In scope for this program

- Ship the CLI to npm with provenance, create a release, and repair the Pages deploy.
- Bind approvals to commits and trees, not only artifact text.
- Report real enforcement per harness and add a CI-level gate for harnesses without native hooks.
- Export evidence as in-toto/DSSE and findings as SARIF, with optional external signing.
- Add Antigravity and Devin targets, portable plugin manifests, a `skills` pack, and a read-only MCP surface.
- Replace stale competitive claims with measured ones and publish evals.

## Deliberately out of scope

- Hosted SaaS, accounts, SSO, billing or telemetry.
- Replacing a harness's native plan mode or sandbox.
- A 21st skill, or a new gate without deleting or merging one.
- A rename. The collision with AWS AI-DLC is documented, not solved by renaming.
- Cryptographic identity guarantees. Signing is optional and external; the core stays hash-chained and honest about its limits.
