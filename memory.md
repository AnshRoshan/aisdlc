# Memory

Session handoff. Updated at the end of every session so any agent or human can continue without re-explaining.

_Last updated: 2026-10-21_

## Current state

- Renamed throughout to **`arsdlc`**: 873 occurrences, 102 files, 20 skill folders, the bin, the guard module, the `arsdlc.json` marker and both plugin manifests. Pushed as `763ccd9`, tagged `v0.3.0`.
- **`arsdlc@0.3.0` is live on npm** (`latest` → 0.3.0; `0.0.0-stage` is the anti-typosquat hold npm parked the first publish under for a few hours before the staged release cleared). Published from a laptop, so it carries **no provenance**. The scoped `@anshroshan/arsdlc` was never published; every install string is `npx arsdlc …` again.
- `main` is pushed through `763ccd9`; the 0.3.1 packaging pass is the working tree at the time of writing.
- Enforcement is tested and live: commit-bound approvals, `arsdlc ci`, per-harness enforcement levels in `doctor`, the reusable gate workflow, `antigravity` and `devin` targets. Evidence exports as in-toto/DSSE plus SARIF and verifies offline. `arsdlc mcp --stdio` serves read-only state.
- 87/87 CLI tests, 12/12 guard tests, 6/6 site tests, corpus check green on 23 commands, secrets scan clean, site builds 23 pages, plugin validation passes.
- Still open externally: there is no GitHub release for any tag, npm trusted publishing is not registered (so CI publish would still need `NPM_TOKEN`), and `aisdlc-cli`/`aisdlc`/`@anshroshan/aisdlc` are 404 - the CHANGELOG claimed 0.2.1 shipped to npm and that claim is now corrected.

## Next step

Two commands, in this order, from you:

1. Publish `arsdlc@0.3.1` from `packages/cli`: `npm publish --access public`, no `--provenance`. The version bump is required - a published tarball's contents are frozen, so the metadata and README fixes can only ship as a new version.
2. Create the release: `gh release create v0.3.1 --generate-notes` (0.3.0 has been on npm with no release next to it).

Then close T2, T3 and T4 with recorded evidence. Provenance needs the npm trusted publisher registered for this repo + workflow on the npm package page; until then CI publish uses `NPM_TOKEN` and publishes unsigned. T20 needs a runner and real model runs before any number exists; T13 needs a Codex or Copilot client that accepts a catalog file.

## Open questions

- G1 was skipped on instruction (F-04). Is pre-approval implementation acceptable here, or does phase 1 get re-sequenced after a signature?
- Solo SoD (F-05): `author` is recorded as the plan agent so a human can sign. How should a one-person project pass G1 honestly - second human, declared degradation, or a lane that does not require G1?
- Export, verifier, signer adapter and MCP were built before their tests (finding F6). One-off, or a rule the guard should enforce?
- Does npm trusted publishing work for this account, or is a scoped automation token still required (F-01)?
- No harness except Claude Code has a confirmed hook that can block a tool call (F-02, updated). T11 and T13 stay open until a real install proves the schema.
- Tree binding is content-based (D-11). Watch for re-approval churn in real use (F-03).
