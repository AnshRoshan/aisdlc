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
- npm's Insights score the package 77 on Supply Chain Security (Vulnerability/Quality/Maintenance/License 100/88/100/100). It is a trust-maturity reading, not a finding: no build attestation, human laptop publish, minutes-old single-maintainer package with zero downloads and zero dependents. `0.0.0-stage` scoring 51 is npm's own stub, not us. The two levers are provenance from CI and a GitHub release; the README now carries the reproducible check that covers the gap meanwhile (all 38 tarball files blob-match `v0.3.0`).

## Next step

`0.3.1` is tagged at `7119890` (`ci` and `deploy site` green on main and on the tag). Only the
registry and the release page are left, and both are your credentials. One of these, in this order of preference:

```bash
# A - provenance, the path CI already reaches for.
#   npm package page -> Publishing -> Trusted publishing -> add publisher:
#   owner AnshRoshan, repo arsdlc, branch main, workflow publish.yml, environment empty.
#   Then:
gh run rerun 39577197571 --failed

# B - the fast one, unsigned, from this laptop:
cd packages/cli && npm publish --access public
```

Then, whichever way the version lands:

```bash
gh release create v0.3.1 --generate-notes --latest
```

A already proved one thing worth knowing: the CI job wrote a signed provenance statement for
`arsdlc@0.3.1` to the Sigstore transparency log *before* npm refused the PUT, so a failed CI publish is
not fully clean - two attestations for a version that does not exist are now public (logIndex 3353477021
and 3353537406, from the tag and from re-pointing it). Do not push another `v0.3.1` tag; publish the
version, then close T2, T3 and T4 with recorded evidence. T20 needs a runner and real model runs before
any number exists; T13 needs a Codex or Copilot client that accepts a catalog file.

## Open questions

- G1 was skipped on instruction (F-04). Is pre-approval implementation acceptable here, or does phase 1 get re-sequenced after a signature?
- Solo SoD (F-05): `author` is recorded as the plan agent so a human can sign. How should a one-person project pass G1 honestly - second human, declared degradation, or a lane that does not require G1?
- Export, verifier, signer adapter and MCP were built before their tests (finding F6). One-off, or a rule the guard should enforce?
- Does npm trusted publishing work for this account, or is a scoped automation token still required (F-01)?
- No harness except Claude Code has a confirmed hook that can block a tool call (F-02, updated). T11 and T13 stay open until a real install proves the schema.
- Tree binding is content-based (D-11). Watch for re-approval churn in real use (F-03).
