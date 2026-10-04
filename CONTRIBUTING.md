# Contributing to aisdlc

Thanks for looking under the hood. The project is small and opinionated; here is how it fits together so your PR lands cleanly.

## Layout

- `skills/` — one folder per skill, each with a `SKILL.md` (open Agent Skills format, MIT). A skill may
  grow `references/*.md` for content that is rare *and* long; the trigger to read it must be explicit.
- `agents/` — the two read-only subagent definitions `init` installs for Claude Code. Model pinning lives
  here, never in skill prose.
- `packages/cli/` — zero-dependency Node CLI (Node ≥ 18). Tests: `cd packages/cli && npm test`.
- `site/` — Astro static site; the deploy workflow builds and uploads it, Pages is not enabled yet.
- `docs/conventions.md` — how a skill is written and what it costs. Read it before editing `skills/`.
- `docs/RESEARCH.md` — where design decisions and their sources are recorded, gap analyses included.

## Rules of the road

1. **Skills are prose, the CLI is law.** Behavioural guidance goes in a SKILL.md; anything that must be enforced deterministically belongs in `packages/cli/src/engine.js` as a pure function over files. A check that can be satisfied by rephrasing the prose is not a check.
2. **No dependencies in the CLI.** It must stay runnable with nothing but Node.
3. **Gate changes need evidence.** If you change what G1–G6 check, update the tests and the skill docs that reference them in the same PR, and add a test that names the failure the check prevents.
4. **Skill descriptions are load-bearing.** The `description` frontmatter is what makes a harness trigger the skill; keep it concrete (what the user says, when to use it). The format allows 1024 characters; keep it under 512, because every installed description loads into every session.
5. **The corpus is checked, not reviewed.** `cd packages/cli && npm run check:skills` verifies that every command a skill or doc advertises exists, every `aisdlc-*` token names a real skill or agent, every referenced sub-file is on disk, every relative link resolves, and no path exceeds its byte budget. CI runs it. When it warns about a budget, prune; do not raise the ceiling.

## PR checklist

- [ ] `npm test` passes in `packages/cli` (CI runs it on Node 18/20/22)
- [ ] `npm run check:skills` passes (the `corpus` job)
- [ ] `node bin/aisdlc.js scan` is clean in `packages/cli` - the kit must pass its own gates
- [ ] `npm run build` passes in `site` if you touched it
- [ ] New behaviour is documented in the affected SKILL.md files or the README, and in CHANGELOG.md

## Reporting bugs

Open an issue with: the harness you used, `aisdlc doctor` output (`node packages/cli/bin/aisdlc.js doctor` if you run it from a clone), and the smallest repo state that reproduces (the `aisdlc.json` and `docs/features/` files are enough — no need for your code).

## Releasing the CLI

1. Bump `version` in `packages/cli/package.json` and add a CHANGELOG.md entry.
2. `cd packages/cli && npm test` — the publish workflow runs the tests again before publishing.
3. `git tag vX.Y.Z && git push --tags`. The `publish cli` workflow publishes to npm and opens a GitHub release.
   - One-time setup: add an npm **automation** token as the repository secret `NPM_TOKEN` (npmjs.com → Access Tokens → Generate Token → Automation).
   - Local alternative: `npm login`, then `cd packages/cli && npm publish --access public` (`prepack` syncs `skills/` into the tarball automatically).
