# Contributing to aisdlc

Thanks for looking under the hood. The project is small and opinionated; here is how it fits together so your PR lands cleanly.

## Layout

- `skills/` — one folder per skill, each with a single `SKILL.md` (open Agent Skills format, MIT).
- `packages/cli/` — zero-dependency Node CLI (Node ≥ 18). Tests: `cd packages/cli && npm test`.
- `site/` — Astro static site, deployed to GitHub Pages. Build: `cd site && npm run build`.
- `docs/RESEARCH.md` — where design decisions and their sources are recorded.

## Rules of the road

1. **Skills are prose, the CLI is law.** Behavioural guidance goes in a SKILL.md; anything that must be enforced deterministically belongs in `packages/cli/src/engine.js` as a pure function over files.
2. **No dependencies in the CLI.** It must stay runnable with nothing but Node.
3. **Gate changes need evidence.** If you change what G1–G6 check, update the tests and the skill docs that reference them in the same PR.
4. **Skill descriptions are load-bearing.** The `description` frontmatter is what makes a harness trigger the skill; keep it concrete (what the user says, when to use it) and under the format's limits.

## PR checklist

- [ ] `npm test` passes in `packages/cli` (CI runs it on Node 18/20/22)
- [ ] `npm run build` passes in `site` if you touched it
- [ ] New behaviour is documented in the affected SKILL.md files or the README

## Reporting bugs

Open an issue with: the harness you used, `npx aisdlc doctor` output, and the smallest repo state that reproduces (the `aisdlc/` and `docs/features/` files are enough — no need for your code).
