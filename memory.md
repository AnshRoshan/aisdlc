# Memory

Session handoff. Updated at the end of every session so any agent or human can continue without re-explaining.

_Last updated: 2026-10-21_

## Current state

- Renamed throughout to **`arsdlc`**: 873 occurrences, 102 files, 20 skill folders, the bin, the guard module, the `arsdlc.json` marker and both plugin manifests. Registry, PyPI and GitHub all say the name is unclaimed.
- `main` is pushed through `09e1b4e` (that commit still carried `@anshroshan/aisdlc`); the rename is the working tree at the time of writing and is about to be committed and pushed.
- Enforcement is tested and live: commit-bound approvals, `arsdlc ci`, per-harness enforcement levels in `doctor`, the reusable gate workflow, `antigravity` and `devin` targets. Evidence exports as in-toto/DSSE plus SARIF and verifies offline. `arsdlc mcp --stdio` serves read-only state.
- 87/87 CLI tests, 12/12 guard tests, 6/6 site tests, corpus check green on 23 commands, secrets scan clean, site builds 23 pages, plugin validation passes.
- Still open externally: nothing is on npm, there is no GitHub release, and the GitHub repo is still named `aisdlc` until it is renamed.

## Next step

Two commands, in this order, from you:

1. `gh repo rename arsdlc` in the repo root - GitHub redirects the old URL.
2. Publish `arsdlc@0.3.0` with `npm publish --access public`, no `--provenance`. If npm again answers `403 too similar to ai-sdlc`, publish `@anshroshan/arsdlc` instead; the bin and every string in the repo stay `arsdlc` either way.

Then I create the release, flip the README install cell to the live command, and close T2, T3 and T4 with recorded evidence. T20 needs a runner and real model runs before any number exists; T13 needs a Codex or Copilot client that accepts a catalog file.

## Open questions

- G1 was skipped on instruction (F-04). Is pre-approval implementation acceptable here, or does phase 1 get re-sequenced after a signature?
- Solo SoD (F-05): `author` is recorded as the plan agent so a human can sign. How should a one-person project pass G1 honestly - second human, declared degradation, or a lane that does not require G1?
- Export, verifier, signer adapter and MCP were built before their tests (finding F6). One-off, or a rule the guard should enforce?
- Does npm trusted publishing work for this account, or is a scoped automation token still required (F-01)?
- No harness except Claude Code has a confirmed hook that can block a tool call (F-02, updated). T11 and T13 stay open until a real install proves the schema.
- Tree binding is content-based (D-11). Watch for re-approval churn in real use (F-03).
- The rename was declined. The collision with AWS AI-DLC stays a discoverability cost; no action without a new decision.
