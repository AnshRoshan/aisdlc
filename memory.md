# Memory

Session handoff. Updated at the end of every session so any agent or human can continue without re-explaining.

_Last updated: 2026-10-21_

## Current state

- Repo synced at `b14ebf2`; the tree is dirty with phase 0 to 3 work. Nothing is committed or pushed.
- Project context is scaffolded and maintained: `AGENTS.md`, `CLAUDE.md`, `context/`, `docs/glossary.md`, this file, `.claude/settings.json`.
- Enforcement landed and is tested: approvals bind `head`/`tree`/`git` and fail when content moved after a signature; `report` shows the binding and exits 3 on drift; `doctor` prints a per-harness enforcement level; `aisdlc ci` plus `.github/workflows/gates.yml` give every harness a merge check; `antigravity` and `devin` targets exist and the retired layouts print a notice.
- Evidence is portable: `aisdlc export` writes an in-toto Statement v1, a DSSE envelope, copies of every artifact and evidence record, SARIF 2.1.0 and `verify.md`; `export --verify` recomputes digests offline and exits 1 naming the tampered file; `--sign` shells out to an external signer without requiring one.
- `aisdlc mcp --stdio` serves read-only state to any MCP client; write-shaped tool calls are refused with the CLI command a human must run.
- 87/87 CLI tests pass, the corpus check passes with 23 commands cross-checked, and `aisdlc ci` exits 0.
- Still broken and needing you: npm 404, no GitHub release, the Pages fix is unverified, and G1 is unsigned (the F-04 override is recorded).

## Next step

Publish as `aisdlc@0.3.0` from `packages/cli` with `npm publish --access public` - no `--provenance`: a local publish has no OIDC identity provider and npm refuses with `Automatic provenance generation not supported for provider: null`. Provenance belongs to the CI path; register this repo and `publish.yml` as a trusted publisher on the npm package page afterwards so 0.3.1 onward carries it automatically.

Then I cut `v0.3.0`, create the GitHub release, confirm the registry and Pages, and close T2, T3 and T4.

T20 needs a runner and real model runs before any number is published. T13 needs a Codex or Copilot client that actually accepts a catalog file.

## Open questions

- G1 was skipped on instruction (F-04). Is pre-approval implementation acceptable here, or does phase 1 get re-sequenced after a signature?
- Solo SoD (F-05): `author` is recorded as the plan agent so a human can sign. How should a one-person project pass G1 honestly - second human, declared degradation, or a lane that does not require G1?
- Export, verifier, signer adapter and MCP were built before their tests (finding F6). One-off, or a rule the guard should enforce?
- Does npm trusted publishing work for this account, or is a scoped automation token still required (F-01)?
- No harness except Claude Code has a confirmed hook that can block a tool call (F-02, updated). T11 and T13 stay open until a real install proves the schema.
- Tree binding is content-based (D-11). Watch for re-approval churn in real use (F-03).
- The rename was declined. The collision with AWS AI-DLC stays a discoverability cost; no action without a new decision.
