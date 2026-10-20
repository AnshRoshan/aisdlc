# Build Plan

One program, five phases. Scope (what) stays separate from technology (how). The per-change source of truth is `docs/features/market-readiness/`; this file only sequences it.

## Phase 0 - Ship what exists (P0)

- Feature 01: Release pipeline repair -> `docs/features/market-readiness/tasks.md` T1-T4
  - Pages deploy on Node 22, npm trusted publishing with provenance, release at HEAD, live site verified.
- Feature 02: Truthful positioning -> T5
  - Remove stale "competitors only advise" claims; add the October 2026 competitor and harness facts.

## Phase 1 - Re-earn the enforcement moat (P0/P1)

- Feature 03: Commit-bound approvals -> T6-T8
  - Record `head` and `tree` at G1/G4/G5; fail when the tree moved after signing; show the binding in `report`.
- Feature 04: Enforcement parity -> T9-T11
  - `doctor --json` enforcement matrix; a reusable CI gate; native adapters where the harness API is stable.

## Phase 2 - Distribution and interop (P1)

- Feature 05: Harness targets and packaging -> T12-T13
  - Antigravity and Devin targets, aliases for retired names, portable plugin manifests, `skills` pack.
- Feature 06: MCP state surface -> T14
  - Read-only `next`/`status` over stdio; writes stay on the CLI.

## Phase 3 - Exportable evidence (P1)

- Feature 07: Attestations and findings -> T16-T19
  - in-toto Statement v1 with a gate-evidence predicate, DSSE envelope, SARIF 2.1.0, `aisdlc export`, optional signing.

## Phase 4 - Credibility (P2)

- Feature 08: Public evals -> T20
  - Seeded fake-green tasks, with/without-gate runs, published results.
- Feature 09: Launch -> T21
  - Honest launch post, docs, skills.sh and plugin listings.

## Rules

- One system boundary per spec. If a phase grows past five tasks, split it into its own feature folder and leave a pointer here.
- New ideas discovered during the build are appended here as new features, then specced. Never implemented silently.
- A phase does not start until the previous phase's gates are green or the human explicitly accepts the risk.

## Delivered out of band

- Feature 10: system-design and operations checklists, 111 numbered items in two plan branches -> `skills/aisdlc-plan/references/`. Shipped 2026-10-20 on the maintainer's request; decision D-10. Not part of the market-readiness task list.
