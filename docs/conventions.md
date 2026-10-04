# Writing a skill

`node packages/cli/scripts/check-skills.mjs` enforces parts of this. Read it before editing anything in `skills/`.

A SKILL.md loads in full, on its path, every time the agent takes that branch. Every line is a
cost the user pays per invocation, so the bar for adding one is high and the bar for keeping one
is higher. Prune before you add.

## What earns a line

- It changes what the agent **does**. "Be thorough", "careful with edge cases", "think it through"
  change nothing; the model already believes it does them. Delete the whole sentence, not the adjective.
- It states a checkable condition. A step is `if X -> do Y`, or a line the CLI can verify. A step that
  describes what the next step will feel like is narrative, and narrative belongs in `docs/RESEARCH.md`.
- It names a concept instead of explaining it ("tracer bullet", "lane", "owed decision"). Invented terms
  get spelled out once, in one place, and referenced by name everywhere else.
- Reasoning, alternatives considered, and history go in the commit message or `docs/RESEARCH.md`.
  The skill carries the instruction, not the argument for it.

Say a thing once. The only intentional duplication is the eight invariants, which appear in
`aisdlc-flow` and in the generated instructions block because a skill must stand alone when
installed on its own.

## Shape

- Steps end in a condition, not a description. `- [ ]` or `if/then`, never "then we will want to".
- Every question a skill asks a human carries exactly one recommended answer with a one-line why.
  A neutral menu pushes the work back onto the user and gets skipped.
- Close with the output contract: one line of `lane · state -> next action -> owner`, the files you
  touched, and the `aisdlc next` output after the change. No "summary of what I did" paragraphs.
- Length is not a goal. 60 tight lines beat 120 that include six of encouragement.

## When to add a sub-file

Only when content is **both rarely needed and long**. Short or common belongs inline, even if it
makes the router bigger. When you do split, the trigger must be explicit or the agent will miss it:

```
if the CLI is unavailable, read `references/manual-derivation.md` and follow it before continuing.
```

`check-skills.mjs` fails the build if a skill names a `references/`, `modes/` or `templates/` file
that does not exist, so triggers cannot rot.

## Budgets

| what | limit | why |
|---|---|---|
| `SKILL.md` | 13 KB, warn at 90% | the always-loaded cost of that branch |
| a sub-file | 9 KB, warn at 90% | it only pays when read, so it can be longer than a router |
| a hot path | see `HOT_PATHS` in the checker | what a real run actually loads: required files + the largest alternative |
| `description:` | 1024 hard (format cap), warn at 512 | every installed description loads into every session |

Our descriptions run longer than the 400 characters some kits use on purpose: the user phrases in
them ("where are we", "is it done", "poke holes") are the discovery surface, and cutting them
trades a small token saving for skills that stop firing. Stay under 512 and keep the phrases.

A warning means **prune**, not raise the ceiling. A ceiling fitted to the current byte count fires
on every edit, and the only way past a guard that always fires is to loosen it, which is how a
budget stops meaning anything. Raise a number only when the path genuinely needs to carry more,
and write the reason in the comment next to it.

A prune must not change behavior. If a cut might, say so and prove it by running the flow:
`aisdlc new` in a scratch repo, walk the gates, compare `next` output before and after.

## Portability

The same file must be honest on Claude Code, Codex, Cursor, Gemini CLI, Copilot, Windsurf and
OpenCode. So in `skills/` and `commands/`:

- No hardcoded model alias in a spawn instruction (`model: "haiku"`). Say *a fast, low-cost tier*
  and let the harness-specific agent definition pin the alias. Agents that inherit the session
  model silently cost the user the expensive one.
- Never name one client's subagent tool ("the Task tool", "spawn an Agent"). Say "spawn a
  read-only subagent" and list the equivalents, degrading to inline work when a client has none.
- No shell glue that dies on PowerShell (`>/dev/null`, `&& BASE=`). Git commands are fine;
  base-branch selection is prose.

Read-only exploration is what a subagent is for; the writing and the user-facing question stay on
the main thread. A subagent returns a compact map, not file contents.

## Adding or changing a gate check

Behavior goes in a SKILL.md; anything that must be enforced goes in `packages/cli/src/engine.js` as
a pure function over files, with a test that names the failure it prevents. Same files, same answer,
any machine, or it is advice, not a gate. A check that can be satisfied by a cleverer phrasing of the
same prose is not a check.
