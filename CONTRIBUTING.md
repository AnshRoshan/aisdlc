# Contributing to aisdlc

## Layout and ownership

- `skills/`: 20 canonical Agent Skills. Read `docs/conventions.md` before editing; load rare, long branches explicitly from `references/`.
- `agents/`: read-only scout/researcher definitions; harness model pinning belongs here, not in portable skills.
- `packages/cli/`: zero-dependency Node CLI (Node ≥18). Enforced behavior lives in pure engine functions; filesystem/process boundaries live in the CLI and helpers.
- `hooks/`: Claude Code guard mod and contract-based regressions. It is heuristic/fail-open, not an adversarial security boundary.
- `site/`: Astro7 static site, lockfile, rendering/clipboard tests and production build. Astro requires Node≥22.12; use the latest22 patch or Node24 for locked dependency compatibility.
- `docs/`: authoring conventions, project steering, historical research and feature artifacts. The demo is deliberately unfinished scaffolding, not evidence of a passing feature.

## Rules

1. **Skills are prose; the CLI is law.** A deterministic check cannot be replaced by advice.
2. **Keep the CLI dependency-free.** Node standard library only.
3. **Gate changes need regression tests and matching prose.** Test the prevented failure, not just the happy path.
4. **Do not manufacture signatures or evidence.** Tests use temporary fixture projects; leave real feature approvals alone.
5. **Respect the trust boundary.** Names, environment and local files are trusted inputs. Hashes detect partial/accidental tampering, not authenticated authorship.
6. **Preserve portability.** CLI CI covers Node18/20/22. Avoid implicit shell interpolation; Windows argument/junction regressions must stay covered.
7. **Keep context costs measured.** Descriptions stay under512 characters, skills under13KB, references under9KB and operational hot paths under their existing budgets. Prune instead of raising limits.
8. **Review test quality.** A label named full and a zero exit code cannot establish that a command actually tested every behavior.

## Local validation

Run from the repository root, stopping on any failed command:

```text
npm --prefix packages/cli test
node packages/cli/scripts/check-skills.mjs
node packages/cli/bin/aisdlc.js scan
node --test hooks/test/*.test.mjs
npm --prefix site test
npm --prefix site run build
claude plugin validate .
git diff --check
```

The installed Claude CLI is optional for source tests but required to claim actual host manifest validation.
The static corpus checker does not validate arbitrary plugin API field shapes: keep runtime-shaped mocks
and check the official docs when the API changes. A build is not a browser or accessibility audit.

After changing canonical skills/agents, run `node packages/cli/scripts/sync-skills.mjs`. `npm pack` also
runs the sync hook. Generated copies are not the source of truth.

## Compatibility checks

- Old approval hashes intentionally become stale when their binding format or intent changes. Humans re-review/re-approve; never rewrite a chain to fake compatibility.
- Legacy evidence remains history but cannot earn a gate. A new checksummed source-bound run restores proof without deleting history.
- `test.gate: none-by-design` requires a meaningful `test.reason`; it never waives recorded evidence or human review.
- Installer copy mode preserves extra files; link mode must not delete a user directory. Platform fixtures must cover physical aliases and different drives where available.

## Reporting bugs

Include harness/runtime versions, `aisdlc doctor`, the failing command and the smallest sanitized artifact
state. Do not attach private code, credentials or unredacted output. State what was actually executed.

## Release checklist

1. Update CLI/plugin/marketplace versions consistently and add a changelog entry.
2. Run every local check above; inspect the package with `npm pack --dry-run` in `packages/cli`.
3. Confirm published tarball includes all20 skills, both agents, the CLI and MIT attribution.
4. Push a `vX.Y.Z` tag matching the package version. The publish workflow tests, publishes using the
   configured npm token and creates a release. Verify registry publication and Pages activation separately;
   a workflow definition is not proof that either service is live.
