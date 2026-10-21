# Rollout: Market readiness

## Strategy

Staged CLI releases, not a runtime feature flag. Each phase ships behind an npm dist-tag, is exercised by the smoke path, and only then moves to `latest`.

| Version | Phase | Contents |
|---|---|---|
| 0.2.1 | 0 | Pages fix, npm publish, release, truthful copy |
| 0.3.0 | 1 | Commit-bound approvals, `report` binding, enforcement matrix, CI gate |
| 0.4.0 | 2 | Antigravity and Devin targets, portable manifests, skills pack, MCP read-only |
| 0.5.0 | 3 | in-toto/DSSE and SARIF export, optional signer |
| 0.6.0 | 4 | Published evals and launch |

Prereleases go to `next`. `latest` moves only after the smoke path and the site build pass on the tagged commit.

## Preconditions

- G4 accepted for the phase.
- `npm --prefix packages/cli test` green.
- `node packages/cli/scripts/check-skills.mjs` green.
- `cd site && npm run build` green.
- `claude plugin validate .` green.
- The spec's smoke path has been run and its output recorded as evidence.

## Rollback

1. Stop the rollout: do not move `latest`.
2. `npm deprecate aisdlc@<version> "reason"` and publish a patch from the last good commit.
3. Restore the previous Pages deployment by re-running `deploy site` on the last good commit.
4. Never move or delete a published tag. Record the incident in `context/current-issues.md`.
5. Re-run the smoke path and record the recovery evidence.

Owner: maintainer. Max time to roll back a bad npm version: 15 minutes. A bad Pages deploy is reverted by redeploying the last good commit, not by editing the live artifact.

## Comms

- `CHANGELOG.md` entry from the actual diff.
- GitHub release notes generated from the tag, with the smoke-path result pasted in.
- A launch note only after T21 and the published evals.

Approved-by: ______  Date: ______
