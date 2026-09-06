---
name: aisdlc-taste
description: Capture and apply a project's taste profile (code style, testing philosophy, agent verbosity, laziness level for the ponytail ladder, interview depth, review strictness, definition of done, UI design language) and seed the shared glossary. Use once per project when docs/taste.md is missing, when the user says "this isn't how we do things", "too verbose", "too much ceremony", "be lazier", or before any UI work. Every other aisdlc skill reads docs/taste.md before acting.
license: MIT
metadata:
  author: aisdlc
  version: "2.0"
  stage: any
---

# aisdlc-taste

Taste is the part of engineering that is never written down and always enforced in review. Write it down once so every agent session starts calibrated, and update it the moment the human corrects you.

## Capture (ask, do not assume; infer first)

Before asking, infer defaults from the repo: formatter/linter config, test runner in `package.json`/`pyproject`, existing naming, commit style, PR template, CI. Present each inferred default as the recommended answer. Ask at most **six** questions, in one round for technical users (see `aisdlc-grill`), with concrete options:

1. **Code style:** minimal & explicit / idiomatic & abstracted / whatever the existing repo does. Naming conventions, comment policy, error-handling style.
2. **Testing philosophy:** TDD strict / test-after but required / characterization only for legacy. Which runner, the full-suite command, what "green" means (unit, integration, e2e, visual).
3. **Agent behaviour:** verbosity (terse diffs only / short rationale per change / full teaching mode) · **laziness** (`lite` / `full` / `ultra`, the ponytail intensity) · **interview depth** (one question per turn / rounds of 3-5 / "just take defaults and list them").
4. **Review strictness:** blocking on nits / blocking on correctness + security only / advisory.
5. **Definition of done:** the exact artifacts required before a task is checked off (tests, docs, changelog, screenshot, migration note, evidence label).
6. **UI design language** (only if the kind includes frontend or mobile): reference products, density (spacious ↔ dense), motion (none ↔ expressive), palette constraints, typography, accessibility bar. Say explicitly what "generic" looks like so it can be avoided.

## Write: `docs/taste.md`

```markdown
# Taste profile

## Code
style: ...      naming: ...      comments: ...      errors: ...

## Tests
philosophy: ...   runner: ...   full suite: `<command>`   green means: ...

## Agent behaviour
verbosity: ...   laziness: full   interview: rounds   ask before: <new dependency, schema change, deleting files>   never: <...>

## Review
blocks on: ...   advisory: ...

## Definition of done
- [ ] failing test recorded (red) and passing test recorded (green) at the agreed seam
- [ ] full suite recorded green
- [ ] secrets scan clean
- [ ] ...

## UI (if applicable)
references: ...   density: ...   motion: ...   palette: ...   type: ...   a11y: ...
anti-patterns: ...
```

Also create `docs/glossary.md` if missing:

```markdown
# Glossary
The project's shared language. Agents use these words in code, tests, specs and chat. One line each; add a term the moment it costs a clarification.

- **<term>**: <meaning>
```

## Apply (every skill, every session)

- Read `docs/taste.md` and `docs/glossary.md` before writing code or docs. Quote the relevant line when you make a taste-driven choice ("taste: laziness full → used `lru_cache` instead of a cache class").
- If the user contradicts the profile, update the profile in the same turn and say so. The file wins over memory.
- `laziness` sets the intensity for `aisdlc-ponytail` (and the official `ponytail` if installed). `interview` sets the pacing for `aisdlc-grill`.
- For UI work, pair this with a dedicated design skill (for example `frontend-design` or `impeccable`) and treat `docs/taste.md` §UI as the brief those skills infer from.
- The Definition of done list is what `aisdlc-implement` checks before ticking a task and what `aisdlc-review` audits.
