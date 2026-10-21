# Memory

Session handoff. Updated at the end of every session so any agent or human can continue without re-explaining.

_Last updated: 2026-10-21_

## Current state

- Renamed throughout to **`arsdlc`**: 873 occurrences, 102 files, 20 skill folders, the bin, the guard module, the `arsdlc.json` marker and both plugin manifests. Pushed as `763ccd9`, tagged `v0.3.0`.
- **`arsdlc@0.3.2` is live and `latest`** (published 2026-10-21 by the account owner after npm's `EOTP`; `gitHead` = tag `v0.3.2` = `c102c6f`, and the GitHub release was created by CI on the tag push). It is still a laptop build: `dist` has no `attestations` key, so `npm audit signatures` shows a registry signature and nothing more. `0.3.0` remains on the registry; `0.3.1` is a tag with no package behind it and two orphan Sigstore attestations, so that number is burned.
- T3 and T4 are closed by recorded runs, not by reading pages: a smoke check asserts version == `latest` == `gitHead` == tag commit, and a deploy check fetches the live Pages URLs for the released content. Both are green in `docs/features/market-readiness/evidence/`. Checking T4 honestly surfaced **T22**: the site renders SKILL.md pages but not `references/*.md`, so "the security verification procedure is public" is true of the repo and false of the site.
- `main` is pushed through `763ccd9`; the 0.3.1 packaging pass is the working tree at the time of writing.
- Enforcement is tested and live: commit-bound approvals, `arsdlc ci`, per-harness enforcement levels in `doctor`, the reusable gate workflow, `antigravity` and `devin` targets. Evidence exports as in-toto/DSSE plus SARIF and verifies offline. `arsdlc mcp --stdio` serves read-only state.
- 87/87 CLI tests, 12/12 guard tests, 6/6 site tests, corpus check green on 23 commands, secrets scan clean, site builds 23 pages, plugin validation passes.
- Still open externally: there is no GitHub release for any tag, npm trusted publishing is not registered (so CI publish would still need `NPM_TOKEN`), and `aisdlc-cli`/`aisdlc`/`@anshroshan/aisdlc` are 404 - the CHANGELOG claimed 0.2.1 shipped to npm and that claim is now corrected.
- npm's Insights score the package 77 on Supply Chain Security (Vulnerability/Quality/Maintenance/License 100/100/88/100). It is a trust-maturity reading, not a finding: no build attestation, human laptop publish, minutes-old single-maintainer package with zero downloads and zero dependents. `0.0.0-stage` scoring 51 is npm's own stub, not us. The two levers are provenance from CI and a GitHub release; the README now carries the reproducible check that covers the gap meanwhile (all 38 tarball files blob-match `v0.3.0`).
- The 88 on Maintenance is the same story one level down: GitHub's community profile measured this repo at **57%**, missing issue templates, PR template and a code of conduct. Those files plus SECURITY.md and dependabot are in now and the same endpoint reads **100%**; Dependabot security alerts were switched on and the repo description was still saying `aisdlc`. Release cadence, downloads, stars and a second contributor are not files and cannot be added by a commit.

## Next step

`arsdlc@0.3.2` is on npm, tagged `v0.3.2` at `c102c6f`, released by CI, and the live Pages site matches it.
T3 and T4 are closed with recorded evidence. What is left, in order of what it unblocks:

1. **npm trusted publishing** - package page → Publishing → Trusted publishing → publisher: owner
   `AnshRoshan`, repo `arsdlc`, branch `main`, workflow `publish.yml`, environment empty. That is the only
   step that removes the `EOTP` prompt and gives a tarball an attestation; T2's done-when is "installable
   **and** shows provenance", so it stays open until a CI publish lands. Once registered, a patch bump plus
   tag does the rest without any credentials in the loop.
2. **T10** - the SARIF upload step in `gates.yml`; `arsdlc export --format sarif` already writes the file.
3. **T22** (new, found while closing T4) - the site publishes SKILL.md pages but not `references/*.md`, so
   publish them or stop implying the security-verification procedure is public.
4. **T13 / T15 / T20 / T21** - catalog manifests (needs a real client), the skills listing plus an external
   scan, the eval harness (numbers must come from real runs), and the launch post.

Nothing in this list is blocked on the registry any more. G1 and G5 on the program remain unsigned (F-04,
F-07); the lane model has not yet decided whether pre-approval implementation is acceptable here.

## Open questions

- G1 was skipped on instruction (F-04). Is pre-approval implementation acceptable here, or does phase 1 get re-sequenced after a signature?
- Solo SoD (F-05): `author` is recorded as the plan agent so a human can sign. How should a one-person project pass G1 honestly - second human, declared degradation, or a lane that does not require G1?
- Export, verifier, signer adapter and MCP were built before their tests (finding F6). One-off, or a rule the guard should enforce?
- Does npm trusted publishing work for this account, or is a scoped automation token still required (F-01)?
- No harness except Claude Code has a confirmed hook that can block a tool call (F-02, updated). T11 and T13 stay open until a real install proves the schema.
- Tree binding is content-based (D-11). Watch for re-approval churn in real use (F-03).
